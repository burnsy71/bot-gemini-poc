#!/usr/bin/env node
require("dotenv").config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');

const SOL_RPC = process.env.SOL_RPC || "https://api.mainnet-beta.solana.com";
const SOL_SK_FILE = process.env.SOL_SK_FILE || "secrets/sol_sk.txt";
const MARKET_ID_STR = process.env.PHOENIX_MARKET || "";
const SPREAD_BPS = Number(process.env.MAKER_QUOTE_SPREAD_BPS || "12" );
const SIZE_USD = Number(process.env.MAKER_SIZE_USD || "6.00");
const REFRESH_MS = Number(process.env.MAKER_REFRESH_MS || "600");
const DRY_RUN = String(process.env.MAKER_DRY_RUN || "0") === "1";

const LOG_DIR = path.resolve(__dirname, "logs");
const STATS = path.join(LOG_DIR, "maker_stats.json");

function ensureLogs(){ if(!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR,{recursive:true}); }
function writeStats(obj){ ensureLogs(); try{ fs.writeFileSync(STATS, JSON.stringify(obj), "utf8"); }catch(_){} }
function log(...a){ console.log("[maker]", ...a); }

function loadKeypair(fp) {
  const raw = fs.readFileSync(fp, "utf8").trim();
  if (raw.startsWith("[")) return require('@solana/web3.js').Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  return require('@solana/web3.js').Keypair.fromSecretKey(bs58.decode(raw.replace(/['"]/g,'')));
}

async function runDry(reason){
  if (reason) log("DRY RUN:", reason);
  else log("DRY RUN mode");
  let realized=0, invBase=0, mid=150, avgSpreadBps=null, fills=0, cancels=0;
  writeStats({ realized_usdc:0, inventory_usdc:0, avg_spread_bps:null, fills:0, cancels:0, refresh_ms:REFRESH_MS, status:"dry", updated:Math.floor(Date.now()/1000) });
  while(true){
    mid += (Math.random()-0.5)*0.2; if(mid<1) mid=1;
    const half=(SPREAD_BPS/2)/10000, bid=mid*(1-half), ask=mid*(1+half);
    const bsz=SIZE_USD/bid, asz=SIZE_USD/ask;
    cancels += 2;
    if (Math.random()<0.25){ if(Math.random()<0.5) invBase+=bsz; else { if(invBase>=asz) invBase-=asz; realized+=(ask-bid)*asz; } fills++; }
    const inv=invBase*mid, s=((ask-bid)/mid)*10000; avgSpreadBps = avgSpreadBps==null?s:(0.95*avgSpreadBps+0.05*s);
    writeStats({ realized_usdc:+realized.toFixed(6), inventory_usdc:+inv.toFixed(6), avg_spread_bps:+(avgSpreadBps||0).toFixed(2), fills, cancels, refresh_ms:REFRESH_MS, status:"dry", updated:Math.floor(Date.now()/1000) });
    await new Promise(r=>setTimeout(r, REFRESH_MS));
  }
}

async function runLive(){
  const { Connection, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
  if (!MARKET_ID_STR) return runDry("missing PHOENIX_MARKET");

  const connection = new Connection(SOL_RPC, { commitment: "confirmed" });
  const wallet = loadKeypair(path.resolve(__dirname, SOL_SK_FILE));
  const marketId = new PublicKey(MARKET_ID_STR);

  let phoenix, Phoenix;
  try {
    Phoenix = require("@ellipsis-labs/phoenix-sdk");
    phoenix = await Phoenix.Client.create(connection, "mainnet");
    await phoenix.addMarket(marketId.toString());
    log("Phoenix client ready");
  } catch (e) {
    return runDry("Phoenix init failed: " + e.message);
  }

  const market = phoenix.marketStates.get(marketId.toString());
  if (!market) return runDry("Market not found");

  log("LIVE: market=" + marketId.toBase58() + " spread=" + SPREAD_BPS + "bps size=$" + SIZE_USD);

  let cancels=0, firstRun=true;
  writeStats({ realized_usdc:0, inventory_usdc:0, avg_spread_bps:null, fills:0, cancels:0, refresh_ms:REFRESH_MS, status:"live", updated:Math.floor(Date.now()/1000) });

  function midpointFromLadder(m, ladder){
    const bestBid = ladder.bids.length ? m.ticksToFloatPrice(ladder.bids[0].priceInTicks) : null;
    const bestAsk = ladder.asks.length ? m.ticksToFloatPrice(ladder.asks[0].priceInTicks) : null;
    if (bestBid && bestAsk) return (bestBid+bestAsk)/2;
    return bestBid || bestAsk || null;
  }

  while(true){
    try{
      await phoenix.refreshMarket(marketId.toString());
      const m = phoenix.marketStates.get(marketId.toString());
      if(!m || !m.data){ await new Promise(r=>setTimeout(r, REFRESH_MS)); continue; }

      const ladder = m.getLadder(10);
      const mid = midpointFromLadder(m, ladder);
      if(!mid || !Number.isFinite(mid)){ await new Promise(r=>setTimeout(r, REFRESH_MS)); continue; }

      const half=(SPREAD_BPS/2)/10000, bid=mid*(1-half), ask=mid*(1+half);
      const bsz=SIZE_USD/bid, asz=SIZE_USD/ask;

      if (!firstRun) {
        try {
          const cancelIx = m.createCancelAllOrdersWithFreeFundsInstruction(wallet.publicKey);
          const cancelTx = new Transaction().add(cancelIx);
          await sendAndConfirmTransaction(connection, cancelTx, [wallet], { skipPreflight: true, commitment: 'confirmed' });
          cancels += 2;
        } catch(e) { log("cancel warn:", e.message); }
      }
      firstRun = false;

      try {
        const currentTime = Math.floor(Date.now() / 1000);
        
        
        
        const bidTemplate = {
          side: Phoenix.Side.Bid,
          priceAsFloat: bid,
          sizeInBaseUnits: bsz,
          selfTradeBehavior: Phoenix.SelfTradeBehavior.CancelProvide,
          matchLimit: null,
          clientOrderId: Math.floor(Math.random() * 1000000),
          useOnlyDepositedFunds: false,
          lastValidSlot: null,
          lastValidUnixTimestampInSeconds: currentTime + 30
        };

        const askTemplate = {
          side: Phoenix.Side.Ask,
          priceAsFloat: ask,
          sizeInBaseUnits: asz,
          selfTradeBehavior: Phoenix.SelfTradeBehavior.CancelProvide,
          matchLimit: null,
          clientOrderId: Math.floor(Math.random() * 1000000),
          useOnlyDepositedFunds: false,
          lastValidSlot: null,
          lastValidUnixTimestampInSeconds: currentTime + 30
        };

        const bidIx = m.getLimitOrderInstructionfromTemplate(wallet.publicKey, bidTemplate);
        const askIx = m.getLimitOrderInstructionfromTemplate(wallet.publicKey, askTemplate);

        const placeTx = new Transaction().add(bidIx, askIx);
        await sendAndConfirmTransaction(connection, placeTx, [wallet], { skipPreflight: true, commitment: 'confirmed' });
        log("Placed: bid " + bid.toFixed(4) + " x " + bsz.toFixed(4) + ", ask " + ask.toFixed(4) + " x " + asz.toFixed(4));
      } catch(e) { log("place warn:", e.message); }

      writeStats({ realized_usdc:0, inventory_usdc:0, avg_spread_bps:SPREAD_BPS, fills:0, cancels, refresh_ms:REFRESH_MS, status:"live", updated:Math.floor(Date.now()/1000) });

    } catch(e) { log("loop error:", e.message); }
    await new Promise(r=>setTimeout(r, REFRESH_MS));
  }
}

(async ()=>{
  ensureLogs();
  if (DRY_RUN) return runDry();
  return runLive();
})().catch(e=>{ log("fatal:", e.message); process.exit(1); });
