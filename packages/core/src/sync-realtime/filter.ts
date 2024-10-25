import {
  type TraceFilterFragment,
  type TransactionFilterFragment,
  type TransferFilterFragment,
  buildLogFilterFragments,
  buildTraceFilterFragments,
  buildTransactionFilterFragments,
  buildTransferFilterFragments,
} from "@/sync/fragments.js";
import {
  type BlockFilter,
  type CallTraceFilter,
  type LogFactory,
  type LogFilter,
  type TransactionFilter,
  type TransferFilter,
  isAddressFactory,
} from "@/sync/source.js";
import type {
  SyncBlock,
  SyncCallTrace,
  SyncLog,
  SyncTransaction,
} from "@/types/sync.js";
import { toLowerCase } from "@/utils/lowercase.js";
import { hexToNumber } from "viem";

/**
 * Returns `true` if `log` matches `filter`
 */
export const isLogFactoryMatched = ({
  filter,
  log,
}: { filter: LogFactory; log: SyncLog }): boolean => {
  if (filter.address !== toLowerCase(log.address)) return false;
  if (log.topics.length === 0) return false;
  if (filter.eventSelector !== toLowerCase(log.topics[0]!)) return false;

  return true;
};

/**
 * Returns `true` if `log` matches `filter`
 */
export const isLogFilterMatched = ({
  filter,
  block,
  log,
}: {
  filter: LogFilter;
  block: SyncBlock;
  log: SyncLog;
}): boolean => {
  // Return `false` for out of range blocks
  if (
    hexToNumber(block.number) < filter.fromBlock ||
    hexToNumber(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)
  ) {
    return false;
  }

  return buildLogFilterFragments(filter).some((fragment) => {
    if (
      fragment.topic0 !== null &&
      fragment.topic0 !== log.topics[0]?.toLowerCase()
    )
      return false;
    if (
      fragment.topic1 !== null &&
      fragment.topic1 !== log.topics[1]?.toLowerCase()
    )
      return false;
    if (
      fragment.topic2 !== null &&
      fragment.topic2 !== log.topics[2]?.toLowerCase()
    )
      return false;
    if (
      fragment.topic3 !== null &&
      fragment.topic3 !== log.topics[3]?.toLowerCase()
    )
      return false;

    if (
      isAddressFactory(filter.address) === false &&
      fragment.address !== null &&
      fragment.address !== log.address.toLowerCase()
    )
      return false;

    return true;
  });
};

/**
 * Returns `true` if `callTrace` matches `filter`
 */
export const isCallTraceFilterMatched = ({
  filter,
  block,
  callTrace,
}: {
  filter: CallTraceFilter;
  block: SyncBlock;
  callTrace: SyncCallTrace;
}): boolean => {
  // Return `false` for out of range blocks
  if (
    hexToNumber(block.number) < filter.fromBlock ||
    hexToNumber(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)
  ) {
    return false;
  }

  return buildTraceFilterFragments(filter).some((fragment) => {
    if (
      fragment.fromAddress !== null &&
      fragment.fromAddress !== callTrace.action.from.toLowerCase()
    ) {
      return false;
    }

    if (
      isAddressFactory(filter.toAddress) === false &&
      (fragment as TraceFilterFragment<undefined>).toAddress !== null &&
      (fragment as TraceFilterFragment<undefined>).toAddress !==
        callTrace.action.to.toLowerCase()
    ) {
      return false;
    }

    return true;
  });
};

/**
 * Returns `true` if `callTrace` matches `transferFilter`
 */
export const isTransferFilterMatched = ({
  filter,
  block,
  callTrace,
}: {
  filter: TransferFilter;
  block: SyncBlock;
  callTrace: SyncCallTrace;
}): boolean => {
  // Return `false` for out of range blocks
  if (
    hexToNumber(block.number) < filter.fromBlock ||
    hexToNumber(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)
  ) {
    return false;
  }

  return buildTransferFilterFragments(filter).some((fragment) => {
    if (
      isAddressFactory(filter.toAddress) === false &&
      (fragment as TransferFilterFragment<undefined>).fromAddress !== null &&
      (fragment as TransferFilterFragment<undefined>).fromAddress !==
        callTrace.action.from.toLowerCase()
    ) {
      return false;
    }

    if (
      isAddressFactory(filter.toAddress) === false &&
      (fragment as TransferFilterFragment<undefined>).toAddress !== null &&
      (fragment as TransferFilterFragment<undefined>).toAddress !==
        callTrace.action.to.toLowerCase()
    ) {
      return false;
    }

    // Check if call trace corresponds to native transfer
    if (callTrace.action.input !== "0x") {
      return false;
    }

    return true;
  });
};

/**
 * Returns `true` if `transaction` matches `filter`
 */
export const isTransactionFilterMatched = ({
  filter,
  block,
  transaction,
}: {
  filter: TransactionFilter;
  block: SyncBlock;
  transaction: SyncTransaction;
}): boolean => {
  // Return `false` for out of range blocks
  if (
    hexToNumber(block.number) < filter.fromBlock ||
    hexToNumber(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)
  ) {
    return false;
  }

  return buildTransactionFilterFragments(filter).some((fragment) => {
    if (
      isAddressFactory(filter.toAddress) === false &&
      (fragment as TransactionFilterFragment<undefined>).fromAddress !== null &&
      (fragment as TransactionFilterFragment<undefined>).fromAddress !==
        transaction.from.toLowerCase()
    ) {
      return false;
    }

    if (
      isAddressFactory(filter.toAddress) === false &&
      (fragment as TransactionFilterFragment<undefined>).toAddress !== null &&
      (transaction.to === null ||
        (fragment as TransactionFilterFragment<undefined>).toAddress !==
          transaction.to.toLowerCase())
    ) {
      return false;
    }

    return true;
  });
};

/**
 * Returns `true` if `block` matches `filter`
 */
export const isBlockFilterMatched = ({
  filter,
  block,
}: {
  filter: BlockFilter;
  block: SyncBlock;
}): boolean => {
  // Return `false` for out of range blocks
  if (
    hexToNumber(block.number) < filter.fromBlock ||
    hexToNumber(block.number) > (filter.toBlock ?? Number.POSITIVE_INFINITY)
  ) {
    return false;
  }

  return (hexToNumber(block.number) - filter.offset) % filter.interval === 0;
};
