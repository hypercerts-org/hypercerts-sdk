export const BatchTransferFractionAbi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_hypercertToken",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ internalType: "address", name: "caller", type: "address" }],
    name: "INVALID_CALLER",
    type: "error",
  },
  { inputs: [], name: "INVALID_DATA", type: "error" },
  {
    inputs: [
      {
        internalType: "address",
        name: "hypercertAddress",
        type: "address",
      },
    ],
    name: "INVALID_HYPERCERT_ADDRESS",
    type: "error",
  },
  { inputs: [], name: "INVALID_LENGTHS", type: "error" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address[]",
        name: "to",
        type: "address[]",
      },
      {
        indexed: true,
        internalType: "uint256[]",
        name: "fractionId",
        type: "uint256[]",
      },
    ],
    name: "BatchFractionTransfer",
    type: "event",
  },
  {
    inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
    name: "batchTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "hypercertToken",
    outputs: [
      {
        internalType: "contract IHypercertToken",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
