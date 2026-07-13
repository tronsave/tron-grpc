---
tip: <to be assigned>
title: Post-Quantum Off-Chain Message Signing (signMessage / verifyMessage)
author: TronSave (@tronsave) <admin@tronsave.io>
discussions-to: https://github.com/tronprotocol/tips/issues/899
status: Draft
type: Standards Track
category: Interface
created: 2026-07-13
requires: 899
---

## Simple Summary

An interoperable container ("envelope") that lets a wallet sign an off-chain message with a
post-quantum key, and lets any dApp verify it and recover the signer's TRON address —
the post-quantum counterpart of `signMessageV2` / `verifyMessageV2`.

## Abstract

TIP-899 standardizes post-quantum signatures **on-chain**: `PQAuthSig` carries a scheme, a
public key and a signature inside a `Transaction`, and the node derives the signer's address
from the public key. It says nothing about **off-chain** message signing (`personal_sign`-style
flows: dApp login, "sign this nonce", proof-of-ownership), because for ECDSA no container is
needed — an ECDSA signature is self-describing, and `ecrecover` extracts the signer from the
signature alone.

Lattice signatures have no recovery primitive. A verifier needs the **scheme** and the
**public key** alongside the signature, and a bare signature blob cannot carry them. Without a
standard, every wallet will invent its own container and no dApp will be able to verify a message
signed by a wallet it does not already know about.

This TIP specifies that container. It reuses the existing TRON personal-message digest, the
TIP-899 `PQScheme` registry, the TIP-899 signature encoding, and the TIP-899 address derivation
rule, adding only a self-identifying header so that one verification entry point can accept both
ECDSA signatures and post-quantum envelopes. The result is a hex string, so `signMessageV2`-style
call-sites and wallet-bridge message types do not change.

No consensus change, no protobuf change, and no fork are required: this is an interface standard.

## Motivation

Everything a dApp does before a transaction is off-chain message signing. "Connect wallet" flows,
session tokens, order signing on exchanges, gasless approvals, and ownership proofs all rest on
`signMessageV2` + `verifyMessageV2`. If TIP-899 lands without an off-chain counterpart, a
post-quantum account can transact but cannot log in.

Three concrete problems, none of which a wallet can solve on its own:

1. **The public key must travel with the signature.** Falcon and ML-DSA have no `ecrecover`.
   A verifier that receives only a signature cannot obtain the key, so it cannot derive an address
   and has nothing to compare against.
2. **The signature must say which scheme it is.** TIP-899 already registers more than one scheme
   (`FN_DSA_512`, `ML_DSA_44`). A verifier handed 1500 opaque bytes cannot know which verifier to
   call, and guessing from the length breaks the moment a third scheme is registered.
3. **One verifier must accept both key types.** A dApp cannot ask its users which cryptography
   their wallet uses. `verifyMessage(message, signature)` has to work whether the signature came
   from a secp256k1 wallet or a post-quantum one.

The envelope below solves all three in 9 bytes of overhead, and is already implemented and
tested against Nile (see *Reference Implementation*).

## Specification

The key words "MUST", "MUST NOT", "SHOULD", and "MAY" are to be interpreted as described in
RFC 2119.

### 1. Message digest

The digest is **unchanged** from ECDSA message signing — the `\x19TRON Signed Message:\n`
convention used by `signMessageV2`:

```
digest = Keccak-256( "\x19TRON Signed Message:\n" ‖ ascii(len(utf8(message))) ‖ utf8(message) )
```

where `len` is the byte length of the UTF-8 encoding of `message`, rendered as decimal ASCII.
Post-quantum signers MUST use this digest. Sharing one hashing rule across both key types means
wallets keep one message-signing UI and one digest implementation, and it keeps message signatures
domain-separated from transaction signatures (which sign `SHA-256(raw_data)`; see
*Security Considerations*).

### 2. Envelope format

A post-quantum message signature is the following byte string, hex-encoded:

| Offset       | Length    | Field        | Value                                              |
|--------------|-----------|--------------|----------------------------------------------------|
| `0`          | 4         | `magic`      | `0x54 0x50 0x51 0x31` — ASCII `TPQ1`                |
| `4`          | 1         | `scheme`     | TIP-899 `PQScheme` enum value (`1` = `FN_DSA_512`)  |
| `5`          | 2         | `pk_len`     | `uint16`, big-endian                                |
| `7`          | `pk_len`  | `public_key` | As carried in `PQAuthSig.public_key` (TIP-899 §1)   |
| `7+pk_len`   | 2         | `sig_len`    | `uint16`, big-endian                                |
| `9+pk_len`   | `sig_len` | `signature`  | As carried in `PQAuthSig.signature` (TIP-899 §1)    |

Total size: `9 + pk_len + sig_len`.

The `magic` identifies the container and versions it: a future incompatible layout takes `TPQ2`
and old verifiers reject it cleanly rather than misparsing it.

`public_key` and `signature` use **exactly** the encodings TIP-899 defines for the on-chain
`PQAuthSig` fields — the untagged public key and the *headed* compressed signature — so a wallet
has one encoder for both paths, and a signature is byte-identical whether it ends up in a
transaction or in an envelope.

The envelope is transported as a lowercase hex string with a `0x` prefix. Verifiers SHOULD accept
the string with or without the prefix, and MUST treat the hex as case-insensitive.

### 3. Registered schemes

| `scheme` | Name         | `pk_len` | `sig_len` | Envelope size  |
|----------|--------------|----------|-----------|----------------|
| `1`      | `FN_DSA_512` | `896`    | `617–667` | `1522–1572`    |
| `2`      | `ML_DSA_44`  | `1312`   | `2420`    | `3741`         |

`scheme = 0` (`UNKNOWN_PQ_SCHEME`) MUST NOT be produced and MUST be rejected.

Sizes are inherited from TIP-899 and are restated here only so that a verifier can validate
lengths before doing any cryptography. The `ML_DSA_44` row is normative once TIP-899 activates
that scheme; implementations MAY reject it until then.

Lengths are explicit in the envelope rather than implied by the scheme so that a decoder can
*parse* an envelope carrying a scheme it does not know (and reject it with a clear error) instead
of failing to find the field boundaries. A decoder that knows the scheme MUST still validate the
lengths against this table.

### 4. Signing — `signMessage`

Given `message` and a post-quantum private key:

1. Compute `digest` per §1.
2. Produce `signature = Sign_scheme(private_key, digest)`.
   For `FN_DSA_512` the signer MUST apply the same convergence rule as on-chain signatures
   (TIP-899 §1): re-sign with a fresh salt until `617 ≤ len(signature) ≤ 667`. java-tron gives up
   after 16 attempts; implementations SHOULD use the same bound and MUST NOT emit a signature
   outside the range.
3. Emit the envelope of §2 with the signer's `public_key` in the TIP-899 encoding.
4. Return the envelope as a `0x`-prefixed lowercase hex string.

The return type is a string, exactly as `signMessageV2` returns a string. This is deliberate:
existing wallet APIs, provider bridges and dApp call-sites keep working without a new message
type.

### 5. Verification — `verifyMessage`

Given `message` and `envelope`, a verifier MUST:

1. Decode the hex and parse per §2. Reject if the `magic` does not match, if the buffer is
   truncated, **or if any trailing bytes remain** — the total length MUST equal
   `9 + pk_len + sig_len` exactly.
2. Reject an unknown or unsupported `scheme`, including `0`. A verifier MUST NOT treat an
   unrecognized scheme as verified.
3. Reject if `pk_len` or `sig_len` falls outside the scheme's values in §3. For `FN_DSA_512`,
   reject if `signature[0] != 0x39` (the `0x30 | logn` header, `logn = 9`).
4. Compute `digest` per §1 and verify `signature` against `public_key`. Reject on failure.
5. Derive the signer's address from the envelope's public key, using the TIP-899 rule —
   identical for every scheme:

   ```
   address = Base58Check( 0x41 ‖ Keccak-256(public_key)[12..32] )
   ```

6. Return that address.

**The returned address is a claim, not an authorization.** The public key is supplied by the
signer, so any party can produce a valid envelope over any message under a key they own.
Verification proves only that *the holder of this key signed this message*. The caller MUST
compare the returned address against the address it expects. This is the same discipline
`ecrecover` already imposes, but it is easier to get wrong when the key arrives inside the
signature, so implementations SHOULD make the comparison hard to skip.

### 6. Accepting both key types

A verifier that must accept ECDSA and post-quantum signers dispatches on the envelope magic:

```
verifySignedMessage(message, signature):
    if signature starts with magic "TPQ1":  return verifyMessagePQ(message, signature)
    else:                                   return verifyMessageV2(message, signature)   # unchanged
```

The two forms cannot be confused: an ECDSA message signature is exactly 65 bytes, while the
smallest envelope for a registered scheme is 1522 bytes and must begin with `TPQ1`. The ECDSA
path is untouched, so existing behaviour is bit-for-bit preserved.

### 7. Recommended API surface

For consistency across wallets and SDKs:

| Function                                   | Returns                        |
|--------------------------------------------|--------------------------------|
| `signMessagePQ(message, privateKey)`        | envelope (hex string)          |
| `verifyMessagePQ(message, envelope)`        | signer's base58 address        |
| `verifySignedMessage(message, signature)`   | signer's base58 address (both) |

Wallets that route by key type (the pattern TIP-899 encourages for transactions) SHOULD expose the
*existing* `signMessage` entry point and select the algorithm from the account's key type, so that
dApp code does not branch on cryptography at all.

## Rationale

**Why standardize this at all?** It is the one part of TIP-899 that wallets cannot solve
independently. An on-chain PQ transaction is verified by the node, so every wallet
interoperates by construction. An off-chain signature is verified by a dApp, so wallets and dApps
must agree on a container — and if the TIP does not define one, each wallet will ship its own and
dApps will have to special-case wallets.

**Why reuse the TRON personal-message digest instead of defining a PQ-specific one?** A new digest
would fork the message-hashing rule in every wallet, every SDK and every backend verifier, for no
security benefit. The prefix already provides domain separation; the signature scheme underneath
it is orthogonal.

**Why a magic prefix?** It makes the format self-identifying, which is exactly what a lattice
signature is not. It also gives one dispatch point for mixed ECDSA/PQ verification, and a version
lever (`TPQ2`) for future changes.

**Why length-prefix fields the scheme already fixes?** So that parsing does not depend on a scheme
table. An old verifier meeting a newly registered scheme can still find the field boundaries and
emit "unsupported scheme" instead of a length error or, worse, a misparse. It costs 4 bytes on a
~1.5 KB envelope.

**Why not put the address in the envelope?** It is derivable from the public key, and including it
invites verifiers to read the claimed address rather than derive it — turning a signature check
into a self-attestation. Omitting it makes the correct implementation the only implementation.

**Why no chain id, nonce, or expiry?** ECDSA message signing on TRON has none today, and adding
them here would fork the semantics between key types. Applications bind that context in the
message text, exactly as they do now. A future structured-data TIP (TRON's analogue of EIP-712)
can define richer semantics and reuse this envelope unchanged — the envelope wraps a signature
over a 32-byte digest and does not care how the digest was produced.

**Why hex, not base64 or a protobuf?** The wallet API contract is a string, and hex keeps the
value a drop-in for the ECDSA signature it replaces. A protobuf would be smaller but would force a
new message type through every wallet bridge for a 9-byte saving.

## Backwards Compatibility

Fully backwards compatible. This is an off-chain interface standard: no protobuf field, no node
change, no proposal, no fork.

- ECDSA signing and `verifyMessageV2` are unchanged; existing signatures keep verifying.
- Wallets without post-quantum support never produce an envelope, and existing dApps never receive
  one.
- Verifiers that adopt §6 accept both, and can do so before any wallet ships PQ support.
- The envelope carries the full public key. It stays valid if a future TIP-899 phase registers
  public keys on-chain and allows an address-only short form in transactions — an off-chain
  verifier has no chain access to resolve such a reference, and MUST continue to receive the key.

## Test Cases

Generated by the reference implementation and verified against it. `FN_DSA_512`,
`scheme = 1`.

```
message   : "TIP-XXX test vector"
digest    : c9ceaae5a1fbfb64cbb33e574deeae758e630cc3f0dce8333a6d8129fde65d5d
public_key: 62a91c087cc08a7968d830d4ea176625…5a8741d92a415fab33a0de4c9025de00   (896 B)
            SHA-256 1cc09837c6931f9c5988e59ad0acd4e8bc5f13e274573d0edb444822cd4afc90
address   : TXPs3GTBnMZcYZdT4mtvM4vD4vQenaGdoN
envelope  : 5450513101 0380 62a91c08…  0293 3937e77a…                            (1564 B)
            SHA-256 032a6ac50787dc7573eb3f43989a3b07bbc36fd0d04526844d2fac294e6fa9dc
              magic   = 54505131        ("TPQ1")
              scheme  = 01              (FN_DSA_512)
              pk_len  = 0380            (896)
              sig_len = 0293            (659, within 617–667)
              sig[0]  = 39              (0x30 | logn, logn = 9)
```

Expected results:

- `verifyMessagePQ("TIP-XXX test vector", envelope)` → `TXPs3GTBnMZcYZdT4mtvM4vD4vQenaGdoN`
- Any single-bit change to the message, the signature or the public key → rejected
- An envelope with one trailing byte appended → rejected (length mismatch)
- `scheme = 0` or an unregistered scheme → rejected

The full vector, including the private key, is published alongside this draft
(`tip-pq-message-vector.json`). **The key is for test use only and MUST NOT be funded.**

Note that Falcon signing is randomized (a fresh 40-byte salt per signature), so a signer will
**not** reproduce this exact envelope. The vector is a verification vector: an independent
implementation must accept it, not regenerate it.

For cross-implementation confidence at the signature layer (java-tron verifies with BouncyCastle),
the reference implementation is additionally checked against the 100 official Falcon-512 KAT
vectors that BouncyCastle itself is tested against — 100/100 verify, with public keys deriving
identically from the KAT secret keys.

## Reference Implementation

[`tron-grpc`](https://github.com/tronsave/tron-grpc) v2.2.0 (TypeScript, MIT) implements this
specification alongside full TIP-899 transaction signing, verification, and the `VerifyFnDsa512`
precompile encoder. Relevant symbols in `src/utils/pq.ts`:

`encodePqEnvelope` · `decodePqEnvelope` · `isPqEnvelope` · `signMessagePQ` · `verifyMessagePQ` ·
`verifySignedMessage` · `pqPublicKeyToAddress`

The signer-selection pattern of §7 lives in `src/utils/signer.ts`: `getSigner(key)` returns an
`EcdsaSigner` or a `FalconSigner` behind one interface, so `signMessage` call-sites are identical
for both key types.

## Security Considerations

**Compare the derived address.** The signer supplies the public key, so a valid envelope proves
possession of *some* key, not of the key you care about. A verifier that calls `verifyMessagePQ`
and ignores the returned address has authenticated nobody. This is the single most likely
implementation error in this TIP.

**A signature is not a unique token.** Falcon salts every signature, so the same key signing the
same message twice produces two different, equally valid envelopes. Applications MUST NOT use the
signature string as an idempotency key, a session identifier, or a replay guard. Bind a nonce into
the message text and track the nonce.

**Reject non-canonical encodings.** Trailing bytes after `signature` MUST be rejected rather than
ignored, so that an envelope has exactly one encoding. Otherwise an attacker can mint unlimited
distinct strings that verify to the same signer and defeat any deduplication an application layers
on top.

**Domain separation from transactions.** The message digest is `Keccak-256` over the prefixed
text, while a transaction is signed over `SHA-256(raw_data)`. A message signature therefore cannot
be replayed as a transaction signature. Wallets MUST NOT expose an API that signs a caller-supplied
32-byte digest through the message path — that is the mechanism by which the prefix's protection is
lost, and under PQ it is no safer than under ECDSA.

**An off-chain signature is not on-chain authority.** It proves control of a key. It does not prove
that the key is currently in the account's permission set, nor does it satisfy a multi-signature
threshold. Applications that need authorization, rather than authentication, MUST check the account's
permissions on-chain.

**Bound the input before parsing.** `pk_len` and `sig_len` are attacker-controlled up to
`0xFFFF`. Verifiers SHOULD reject envelopes larger than the largest registered scheme (or a fixed
cap) before allocating, and MUST validate both lengths against §3 before any cryptographic work.

**No silent downgrade.** An unknown scheme MUST be a rejection, never a skipped verification or a
fallback to another algorithm.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

---

## Open questions for reviewers

1. **Standalone TIP or an appendix to TIP-899?** The content is small and depends entirely on
   TIP-899's encodings; either shape works. An appendix keeps the PQ story in one document.
2. **Magic value.** `TPQ1` is what the reference implementation ships. Any four bytes work; we have
   no attachment to these, but they should be fixed before wallets ship.
3. **`ML_DSA_44` row.** Should this TIP fix its sizes now (1312 / 2420, per FIPS 204), or defer to
   whenever TIP-899 activates the scheme?
4. **Structured data.** Worth defining a TRON EIP-712 analogue over this envelope in the same
   document, or is that a separate TIP?
5. **Naming.** `signMessagePQ` / `verifyMessagePQ` as explicit entry points, or a single
   `signMessage` / `verifyMessage` that dispatches internally and never exposes the algorithm?
