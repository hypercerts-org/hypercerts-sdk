/**
 * Generated by orval v6.31.0 🍺
 * Do not edit manually.
 * Hypercerts API
 * API for uploading allow lists and hypercert metadata. Visit /graphql for the GraphQL API.
 * OpenAPI spec version: 1.0.0
 */
import axios from 'axios'
import type {
  AxiosRequestConfig,
  AxiosResponse
} from 'axios'
export type DeleteHyperboardParams = {
adminAddress: string;
signature: string;
};

export type ValidateOrder200DataItem = {
  id: string;
  invalidated: boolean;
  validator_codes: OrderValidatorCode[];
};

export type ValidateOrder200 = {
  data: ValidateOrder200DataItem[];
  message: string;
  success: boolean;
};

export type UpdateOrderNonce200Data = {
  address: string;
  chain_id: number;
  created_at: string;
  nonce_counter: number;
};

export type UpdateOrderNonce200 = {
  data: UpdateOrderNonce200Data;
  message: string;
  success: boolean;
};

export type DeleteOrder200 = {
  data: unknown;
  message: string;
  success: boolean;
};

export type DeleteOrderBody = {
  orderId: string;
  signature: string;
};

export type StoreOrder201AnyOfFourData = {
  additionalParameters: string;
  amounts: number[];
  chainId: number;
  collection: string;
  collectionType: number;
  createdAt: string;
  currency: string;
  endTime: number;
  globalNonce: string;
  hash: string;
  hypercert_id: string;
  id: string;
  invalidated: boolean;
  itemIds: string[];
  orderNonce: string;
  price: string;
  quoteType: number;
  signature: string;
  signer: string;
  startTime: number;
  status: string;
  strategyId: number;
  subsetNonce: number;
  validator_codes: number[];
};

export type StoreOrder201AnyOfFour = {
  data: StoreOrder201AnyOfFourData;
  error?: unknown;
  message: string;
  success: boolean;
};

export type StoreOrder201AnyOfTwoData = {
  id: string;
  order: PickAdditionalParametersStringAmountsNumberArrayChainIdNumberCollectionStringCollectionTypeNumberCreatedAtStringCurrencyStringEndTimeNumberGlobalNonceStringIdStringInvalidatedBooleanItemIdsStringArrayOrderNonceStringPriceStringQuoteTypeNumberSignatureStringSignerStringStartTimeNumberStrategyIdNumberSubsetNonceNumberValidatorCodesNumberArrayExcludeKeyofAdditionalParametersStringAmountsNumberArrayChainIdNumberCollectionStringCollectionTypeNumberCreatedAtStringCurrencyStringEndTimeNumberGlobalNonceStringIdStringInvalidatedBooleanItemIdsStringArrayOrderNonceStringPriceStringQuoteTypeNumberSignatureStringSignerStringStartTimeNumberStrategyIdNumberSubsetNonceNumberValidatorCodesNumberArrayIdOrCreatedAtOrInvalidatedOrValidatorCodes;
  valid: boolean;
  validatorCodes: OrderValidatorCode[];
};

export type StoreOrder201AnyOfTwo = {
  data: StoreOrder201AnyOfTwoData;
  error?: unknown;
  message: string;
  success: boolean;
};

export type StoreOrder201AnyOf = {
  data: unknown;
  error: unknown;
  message: string;
  success: boolean;
};

export type StoreOrder201 = StoreOrder201AnyOf | StoreOrder201AnyOfTwo | StoreOrder201AnyOfFour;

/**
 * Interface for validating an allow list dump.
 */
export interface ValidateAllowListRequest {
  allowList: string;
  totalUnits?: string;
}

/**
 * Interface for storing an allow list dump on IPFS
 */
export interface StoreAllowListRequest {
  allowList: string;
  totalUnits?: string;
}

export type HyperboardUpdateRequestCollectionsItemHypercertsItem = {
  factor: number;
  hypercertId: string;
};

export type HyperboardUpdateRequestCollectionsItem = {
  description: string;
  hypercerts: HyperboardUpdateRequestCollectionsItemHypercertsItem[];
  id?: string;
  title: string;
};

/**
 * Interface for updating a hyperboard
 */
export interface HyperboardUpdateRequest {
  adminAddress: string;
  backgroundImg?: string;
  borderColor: string;
  chainIds: number[];
  collections: HyperboardUpdateRequestCollectionsItem[];
  id: string;
  signature: string;
  title: string;
}

export type HyperboardCreateRequestCollectionsItemHypercertsItem = {
  factor: number;
  hypercertId: string;
};

export type HyperboardCreateRequestCollectionsItem = {
  description: string;
  hypercerts: HyperboardCreateRequestCollectionsItemHypercertsItem[];
  id?: string;
  title: string;
};

/**
 * Interface for creating a hyperboard
 */
export interface HyperboardCreateRequest {
  adminAddress: string;
  backgroundImg?: string;
  borderColor: string;
  chainIds: number[];
  collections: HyperboardCreateRequestCollectionsItem[];
  signature: string;
  title: string;
}

export type ApiResponseIdStringOrNullErrors = RecordStringStringOrStringArray | Error[];

/**
 * @nullable
 */
export type ApiResponseIdStringOrNullData = {
  id: string;
} | null;

/**
 * Interface for a generic API response.
 */
export interface ApiResponseIdStringOrNull {
  /** @nullable */
  data?: ApiResponseIdStringOrNullData;
  errors?: ApiResponseIdStringOrNullErrors;
  message?: string;
  success: boolean;
}

/**
 * Response for a created hyperboard
 */
export type HyperboardCreateResponse = ApiResponseIdStringOrNull;

export interface ValidateOrderRequest {
  chainId: number;
  tokenIds: string[];
}

export interface UpdateOrderNonceRequest {
  address: string;
  chainId: number;
}

export interface CreateOrderRequest {
  additionalParameters: string;
  amounts: number[];
  chainId: number;
  collection: string;
  collectionType: number;
  currency: string;
  endTime: number;
  globalNonce: string;
  itemIds: string[];
  orderNonce: string;
  price: string;
  quoteType: number;
  signature: string;
  signer: string;
  startTime: number;
  strategyId: number;
  subsetNonce: number;
}

/**
 * From T, pick a set of properties whose keys are in the union K
 */
export interface PickAdditionalParametersStringAmountsNumberArrayChainIdNumberCollectionStringCollectionTypeNumberCreatedAtStringCurrencyStringEndTimeNumberGlobalNonceStringIdStringInvalidatedBooleanItemIdsStringArrayOrderNonceStringPriceStringQuoteTypeNumberSignatureStringSignerStringStartTimeNumberStrategyIdNumberSubsetNonceNumberValidatorCodesNumberArrayExcludeKeyofAdditionalParametersStringAmountsNumberArrayChainIdNumberCollectionStringCollectionTypeNumberCreatedAtStringCurrencyStringEndTimeNumberGlobalNonceStringIdStringInvalidatedBooleanItemIdsStringArrayOrderNonceStringPriceStringQuoteTypeNumberSignatureStringSignerStringStartTimeNumberStrategyIdNumberSubsetNonceNumberValidatorCodesNumberArrayIdOrCreatedAtOrInvalidatedOrValidatorCodes { [key: string]: unknown }

/**
 * Construct a type with the properties of T except for those in type K.
 */
export type OmitAdditionalParametersStringAmountsNumberArrayChainIdNumberCollectionStringCollectionTypeNumberCreatedAtStringCurrencyStringEndTimeNumberGlobalNonceStringIdStringInvalidatedBooleanItemIdsStringArrayOrderNonceStringPriceStringQuoteTypeNumberSignatureStringSignerStringStartTimeNumberStrategyIdNumberSubsetNonceNumberValidatorCodesNumberArrayIdOrCreatedAtOrInvalidatedOrValidatorCodes = PickAdditionalParametersStringAmountsNumberArrayChainIdNumberCollectionStringCollectionTypeNumberCreatedAtStringCurrencyStringEndTimeNumberGlobalNonceStringIdStringInvalidatedBooleanItemIdsStringArrayOrderNonceStringPriceStringQuoteTypeNumberSignatureStringSignerStringStartTimeNumberStrategyIdNumberSubsetNonceNumberValidatorCodesNumberArrayExcludeKeyofAdditionalParametersStringAmountsNumberArrayChainIdNumberCollectionStringCollectionTypeNumberCreatedAtStringCurrencyStringEndTimeNumberGlobalNonceStringIdStringInvalidatedBooleanItemIdsStringArrayOrderNonceStringPriceStringQuoteTypeNumberSignatureStringSignerStringStartTimeNumberStrategyIdNumberSubsetNonceNumberValidatorCodesNumberArrayIdOrCreatedAtOrInvalidatedOrValidatorCodes;

/**
 * Error errors returned by the order validator contract
 */
export type OrderValidatorCode = typeof OrderValidatorCode[keyof typeof OrderValidatorCode];


// eslint-disable-next-line @typescript-eslint/no-redeclare
export const OrderValidatorCode = {
  NUMBER_0: 0,
  NUMBER_101: 101,
  NUMBER_111: 111,
  NUMBER_112: 112,
  NUMBER_113: 113,
  NUMBER_201: 201,
  NUMBER_211: 211,
  NUMBER_212: 212,
  NUMBER_213: 213,
  NUMBER_301: 301,
  NUMBER_311: 311,
  NUMBER_312: 312,
  NUMBER_321: 321,
  NUMBER_322: 322,
  NUMBER_401: 401,
  NUMBER_402: 402,
  NUMBER_411: 411,
  NUMBER_412: 412,
  NUMBER_413: 413,
  NUMBER_414: 414,
  NUMBER_415: 415,
  NUMBER_421: 421,
  NUMBER_422: 422,
  NUMBER_501: 501,
  NUMBER_502: 502,
  NUMBER_503: 503,
  NUMBER_601: 601,
  NUMBER_611: 611,
  NUMBER_612: 612,
  NUMBER_621: 621,
  NUMBER_622: 622,
  NUMBER_623: 623,
  NUMBER_631: 631,
  NUMBER_632: 632,
  NUMBER_633: 633,
  NUMBER_634: 634,
  NUMBER_701: 701,
  NUMBER_702: 702,
  NUMBER_801: 801,
  NUMBER_802: 802,
  NUMBER_901: 901,
  NUMBER_902: 902,
} as const;

/**
 * Interface for validating metadata.
 */
export interface ValidateMetadataRequest {
  metadata: HypercertMetadata;
}

/**
 * Interface for a validation response.
 */
export type ValidationResponse = ApiResponseValidationResult;

export type ApiResponseValidationResultErrors = RecordStringStringOrStringArray | Error[];

/**
 * Interface for a validation response.
 */
export interface ValidationResult {
  data?: unknown;
  errors?: RecordStringStringOrStringArray;
  valid: boolean;
}

/**
 * Interface for a generic API response.
 */
export interface ApiResponseValidationResult {
  data?: ValidationResult;
  errors?: ApiResponseValidationResultErrors;
  message?: string;
  success: boolean;
}

export type HypercertMetadataPropertiesItem = {
  trait_type?: string;
  value?: string;
  [key: string]: unknown;
};

/**
 * Claim data for hypercert. ERC1155 Metadata compliant
 */
export interface HypercertMetadata {
  /** A CID pointer to the merke tree proof json on ipfs */
  allowList?: string;
  /** Describes the asset to which this token represents */
  description: string;
  /** An url pointing to the external website of the project */
  external_url?: string;
  hypercert?: HypercertClaimdata361;
  /** A URI pointing to a resource with mime type image/* representing the asset to which this token represents. Consider making any images at a width between 320 and 1080 pixels and aspect ratio between 1.91:1 and 4:5 inclusive. */
  image: string;
  /** Identifies the asset to which this token represents */
  name: string;
  properties?: HypercertMetadataPropertiesItem[];
  /** Describes the asset to which this token represents */
  ref?: string;
  /** The version of Hypercert schema used to describe this hypercert */
  version?: string;
}

/**
 * Interface for storing metadata and allow list dump on IPFS.
 */
export interface StoreMetadataWithAllowlistRequest {
  allowList: string;
  metadata: HypercertMetadata;
  totalUnits?: string;
}

/**
 * Interface for storing metadata on IPFS.
 */
export interface StoreMetadataRequest {
  metadata: HypercertMetadata;
}

/**
 * Work time period. The value is UNIX time in seconds from epoch.
 */
export type HypercertClaimdata361WorkTimeframe = {
  display_value?: string;
  name?: string;
  value?: number[];
  [key: string]: unknown;
};

/**
 * Scopes of work
 */
export type HypercertClaimdata361WorkScope = {
  display_value?: string;
  excludes?: string[];
  name?: string;
  value?: string[];
  [key: string]: unknown;
};

/**
 * Rights
 */
export type HypercertClaimdata361Rights = {
  display_value?: string;
  excludes?: string[];
  name?: string;
  value?: string[];
  [key: string]: unknown;
};

/**
 * Impact time period. The value is UNIX time in seconds from epoch.
 */
export type HypercertClaimdata361ImpactTimeframe = {
  display_value?: string;
  name?: string;
  value?: number[];
  [key: string]: unknown;
};

/**
 * Scopes of impact
 */
export type HypercertClaimdata361ImpactScope = {
  display_value?: string;
  excludes?: string[];
  name?: string;
  value?: string[];
  [key: string]: unknown;
};

/**
 * Contributors
 */
export type HypercertClaimdata361Contributors = {
  display_value?: string;
  name?: string;
  value?: string[];
  [key: string]: unknown;
};

/**
 * Properties of an impact claim
 */
export interface HypercertClaimdata361 {
  /** Contributors */
  contributors: HypercertClaimdata361Contributors;
  /** Scopes of impact */
  impact_scope: HypercertClaimdata361ImpactScope;
  /** Impact time period. The value is UNIX time in seconds from epoch. */
  impact_timeframe: HypercertClaimdata361ImpactTimeframe;
  /** Rights */
  rights?: HypercertClaimdata361Rights;
  /** Scopes of work */
  work_scope: HypercertClaimdata361WorkScope;
  /** Work time period. The value is UNIX time in seconds from epoch. */
  work_timeframe: HypercertClaimdata361WorkTimeframe;
  [key: string]: unknown;
}

/**
 * Interface for a storage response.
 */
export type StorageResponse = ApiResponseCidString;

export type ApiResponseCidStringErrors = RecordStringStringOrStringArray | Error[];

export type ApiResponseCidStringData = {
  cid: string;
};

/**
 * Interface for a generic API response.
 */
export interface ApiResponseCidString {
  data?: ApiResponseCidStringData;
  errors?: ApiResponseCidStringErrors;
  message?: string;
  success: boolean;
}

/**
 * Interface for a user add or update request.
 */
export interface AddOrUpdateUserRequest {
  avatar: string;
  chain_id: number;
  display_name: string;
  signature: string;
}

export type ApiResponseErrors = RecordStringStringOrStringArray | Error[];

/**
 * Interface for a generic API response.
 */
export interface ApiResponse {
  data?: unknown;
  errors?: ApiResponseErrors;
  message?: string;
  success: boolean;
}

export type ApiResponseAddressStringOrNullErrors = RecordStringStringOrStringArray | Error[];

/**
 * @nullable
 */
export type ApiResponseAddressStringOrNullData = {
  address: string;
} | null;

/**
 * Interface for a generic API response.
 */
export interface ApiResponseAddressStringOrNull {
  /** @nullable */
  data?: ApiResponseAddressStringOrNullData;
  errors?: ApiResponseAddressStringOrNullErrors;
  message?: string;
  success: boolean;
}

export type AddOrUpdateUserResponse = ApiResponseAddressStringOrNull;

export interface Error {
  message: string;
  name: string;
  stack?: string;
}

/**
 * Construct a type with a set of properties K of type T
 */
export interface RecordStringStringOrStringArray {[key: string]: string | string[]}





  /**
 * Add or update a user
 */
export const addOrUpdateUser = <TData = AxiosResponse<ApiResponseAddressStringOrNull>>(
    address: string,
    addOrUpdateUserRequest: AddOrUpdateUserRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/users/${address}`,
      addOrUpdateUserRequest,options
    );
  }

/**
 * Submits a new hypercert metadata object for validation and storage on IPFS.
When an allowlist URI is provided the service will validate the allowlist data before storing the metadata.
Note that this might lead to a race condition when uploading metadata and the allowlist separately in rapid succession.
In that case we recommend using POST /metadata/with-allowlist instead.
 */
export const storeMetadata = <TData = AxiosResponse<ApiResponseCidString>>(
    storeMetadataRequest: StoreMetadataRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/metadata`,
      storeMetadataRequest,options
    );
  }

/**
 * Submits a new hypercert metadata object paired with allowlist data for validation and storage on IPFS.
The service will parse and validate the allow list data and the metadata.
After successful validation, the allow list data will be uploaded to IPFS and the URI of the allowlist will be attached to the hypercert metadata.
If an allow list URI is already present, the service will return an error.
 */
export const storeMetadataWithAllowlist = <TData = AxiosResponse<ApiResponseCidString>>(
    storeMetadataWithAllowlistRequest: StoreMetadataWithAllowlistRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/metadata/with-allowlist`,
      storeMetadataWithAllowlistRequest,options
    );
  }

/**
 * Validates a hypercert metadata object. When an allowlist URI is provided the service will validate the allowlist data as well.
 */
export const validateMetadata = <TData = AxiosResponse<ApiResponseValidationResult>>(
    validateMetadataRequest: ValidateMetadataRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/metadata/validate`,
      validateMetadataRequest,options
    );
  }

/**
 * Validates a hypercert metadata object paired with allowlist data.
 */
export const validateMetadataWithAllowlist = <TData = AxiosResponse<ApiResponseValidationResult>>(
    storeMetadataWithAllowlistRequest: StoreMetadataWithAllowlistRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/metadata/with-allowlist/validate`,
      storeMetadataWithAllowlistRequest,options
    );
  }

/**
 * Submits a new order for validation and storage on the database.
 */
export const storeOrder = <TData = AxiosResponse<StoreOrder201>>(
    createOrderRequest: CreateOrderRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/marketplace/orders`,
      createOrderRequest,options
    );
  }

/**
 * Delete order from database
 */
export const deleteOrder = <TData = AxiosResponse<DeleteOrder200>>(
    deleteOrderBody: DeleteOrderBody, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.delete(
      `/v1/marketplace/orders`,{data:
      deleteOrderBody, ...options}
    );
  }

/**
 * Updates and returns the order nonce for a user on a specific chain.
 */
export const updateOrderNonce = <TData = AxiosResponse<UpdateOrderNonce200>>(
    updateOrderNonceRequest: UpdateOrderNonceRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/marketplace/order-nonce`,
      updateOrderNonceRequest,options
    );
  }

/**
 * Validates an order and marks it as invalid if validation fails.
 */
export const validateOrder = <TData = AxiosResponse<ValidateOrder200>>(
    validateOrderRequest: ValidateOrderRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/marketplace/orders/validate`,
      validateOrderRequest,options
    );
  }

/**
 * Create a new hyperboard. Creates the collections passed to it automatically.
 */
export const createHyperboard = <TData = AxiosResponse<ApiResponseIdStringOrNull>>(
    hyperboardCreateRequest: HyperboardCreateRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/hyperboards`,
      hyperboardCreateRequest,options
    );
  }

export const updateHyperboard = <TData = AxiosResponse<ApiResponseIdStringOrNull>>(
    hyperboardId: string,
    hyperboardUpdateRequest: HyperboardUpdateRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.patch(
      `/v1/hyperboards/${hyperboardId}`,
      hyperboardUpdateRequest,options
    );
  }

export const deleteHyperboard = <TData = AxiosResponse<ApiResponse>>(
    hyperboardId: string,
    params: DeleteHyperboardParams, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.delete(
      `/v1/hyperboards/${hyperboardId}`,{
    ...options,
        params: {...params, ...options?.params},}
    );
  }

/**
 * Submits a new allowlist for validation and storage on IPFS. While we maintain a database of allowlists, the allowlist itself is stored on IPFS.
Try to keep a backup of the allowlist for recovery purposes.

Provide the dump of the OpenZeppelin MerkleTree and the total units.
 */
export const storeAllowList = <TData = AxiosResponse<ApiResponseCidString>>(
    storeAllowListRequest: StoreAllowListRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/allowlists`,
      storeAllowListRequest,options
    );
  }

/**
 * Submits a new allowlist for validation.

Provide the dump of the OpenZeppelin MerkleTree and the total units.
 */
export const validateAllowList = <TData = AxiosResponse<ApiResponseValidationResult>>(
    validateAllowListRequest: ValidateAllowListRequest, options?: AxiosRequestConfig
 ): Promise<TData> => {
    return axios.post(
      `/v1/allowlists/validate`,
      validateAllowListRequest,options
    );
  }

export type AddOrUpdateUserResult = AxiosResponse<ApiResponseAddressStringOrNull>
export type StoreMetadataResult = AxiosResponse<ApiResponseCidString>
export type StoreMetadataWithAllowlistResult = AxiosResponse<ApiResponseCidString>
export type ValidateMetadataResult = AxiosResponse<ApiResponseValidationResult>
export type ValidateMetadataWithAllowlistResult = AxiosResponse<ApiResponseValidationResult>
export type StoreOrderResult = AxiosResponse<StoreOrder201>
export type DeleteOrderResult = AxiosResponse<DeleteOrder200>
export type UpdateOrderNonceResult = AxiosResponse<UpdateOrderNonce200>
export type ValidateOrderResult = AxiosResponse<ValidateOrder200>
export type CreateHyperboardResult = AxiosResponse<ApiResponseIdStringOrNull>
export type UpdateHyperboardResult = AxiosResponse<ApiResponseIdStringOrNull>
export type DeleteHyperboardResult = AxiosResponse<ApiResponse>
export type StoreAllowListResult = AxiosResponse<ApiResponseCidString>
export type ValidateAllowListResult = AxiosResponse<ApiResponseValidationResult>