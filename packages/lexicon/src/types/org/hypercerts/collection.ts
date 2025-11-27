/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'
import type * as AppCertifiedDefs from '../../app/certified/defs.js'
import type * as ComAtprotoRepoStrongRef from '../../com/atproto/repo/strongRef.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'org.hypercerts.collection'

export interface Main {
  $type: 'org.hypercerts.collection'
  /** The title of this collection */
  title: string
  /** A short description of this collection */
  shortDescription?: string
  coverPhoto?:
    | $Typed<AppCertifiedDefs.Uri>
    | $Typed<AppCertifiedDefs.SmallBlob>
    | { $type: string }
  /** Array of claims with their associated weights in this collection */
  claims: ClaimItem[]
  /** Client-declared timestamp when this record was originally created */
  createdAt: string
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}

export interface ClaimItem {
  $type?: 'org.hypercerts.collection#claimItem'
  claim: ComAtprotoRepoStrongRef.Main
  /** The weight/importance of this hypercert claim in the collection (a percentage from 0-100, stored as a string to avoid float precision issues). The total claim weights should add up to 100. */
  weight: string
}

const hashClaimItem = 'claimItem'

export function isClaimItem<V>(v: V) {
  return is$typed(v, id, hashClaimItem)
}

export function validateClaimItem<V>(v: V) {
  return validate<ClaimItem & V>(v, id, hashClaimItem)
}
