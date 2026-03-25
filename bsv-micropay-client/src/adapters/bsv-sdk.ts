import type { WalletAdapter, Network } from '../types.js'

interface UTXO {
  txid: string
  vout: number
  satoshis: number
}

export interface BsvSdkAdapterOptions {
  privateKey: string
  arcUrl?: string
  arcApiKey?: string
}

export function createBsvSdkAdapter(options: BsvSdkAdapterOptions): WalletAdapter {
  const {
    privateKey: privateKeyWif,
    arcUrl = 'https://arc.taal.com',
    arcApiKey = '',
  } = options

  return {
    async pay(amount: number, address: string, network: Network): Promise<string> {
      let bsvSdk: typeof import('@bsv/sdk')
      try {
        bsvSdk = await import('@bsv/sdk')
      } catch {
        throw new Error(
          '@bsv/sdk is required for the BSV SDK adapter. Install it: npm install @bsv/sdk'
        )
      }

      const { Transaction, PrivateKey, P2PKH, ARC } = bsvSdk

      const privateKey = PrivateKey.fromWif(privateKeyWif)
      const senderAddress = privateKey.toAddress()
      const satoshis = Math.ceil(amount * 1e8)

      const networkPrefix = network === 'testnet' ? 'test' : 'main'
      const utxos = await fetchUTXOs(senderAddress, networkPrefix)
      if (utxos.length === 0) {
        throw new Error('No UTXOs available — fund your agent wallet')
      }

      const tx = new Transaction()

      for (const utxo of utxos) {
        const rawTx = await fetchRawTx(utxo.txid, networkPrefix, Transaction) as InstanceType<typeof Transaction>
        tx.addInput({
          sourceTransaction: rawTx,
          sourceOutputIndex: utxo.vout,
          unlockingScriptTemplate: new P2PKH().unlock(privateKey),
        })
      }

      tx.addOutput({
        lockingScript: new P2PKH().lock(address),
        satoshis,
      })

      tx.addOutput({
        lockingScript: new P2PKH().lock(senderAddress),
        change: true,
      })

      await tx.fee()
      await tx.sign()

      const broadcaster = new ARC(arcUrl, arcApiKey)
      const result = await tx.broadcast(broadcaster)

      if (!result?.txid) {
        throw new Error(`Broadcast failed: ${JSON.stringify(result)}`)
      }

      return result.txid
    },
  }
}

async function fetchUTXOs(address: string, networkPrefix: string): Promise<UTXO[]> {
  const res = await fetch(
    `https://api.whatsonchain.com/v1/bsv/${networkPrefix}/address/${address}/unspent`
  )
  if (!res.ok) throw new Error(`Failed to fetch UTXOs: ${res.status}`)
  const data: Array<{ tx_hash: string; tx_pos: number; value: number }> = await res.json()
  return data.map((u) => ({
    txid: u.tx_hash,
    vout: u.tx_pos,
    satoshis: u.value,
  }))
}

interface TransactionLike {
  fromHex: (hex: string) => unknown
}

async function fetchRawTx(
  txid: string,
  networkPrefix: string,
  TransactionClass: TransactionLike
): Promise<unknown> {
  const res = await fetch(
    `https://api.whatsonchain.com/v1/bsv/${networkPrefix}/tx/${txid}/hex`
  )
  if (!res.ok) throw new Error(`Failed to fetch raw tx ${txid}: ${res.status}`)
  const hex = await res.text()
  return TransactionClass.fromHex(hex.trim())
}
