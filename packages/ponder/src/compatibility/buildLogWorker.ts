import { Log } from "@ethersproject/providers";
import { BigNumber } from "ethers";

import type { DbSchema } from "../db/buildDbSchema";
import type { PonderConfig } from "../readUserConfig";
import { SourceKind } from "../readUserConfig";
import { logger } from "../utils/logger";
import type { GraphHandlers } from "./readMappings";

type LogWorker = (log: Log) => Promise<void>;

const buildLogWorker = (
  config: PonderConfig,
  dbSchema: DbSchema,
  handlers: GraphHandlers
): LogWorker => {
  // const entityNames = dbSchema.tables.map((table) => table.name);
  // const sources = config.sources.filter(
  //   (source) => source.kind === SourceKind.EVM
  // );

  // const entities: {
  //   [key: string]: () => Knex.QueryBuilder<Record<string, unknown>> | undefined;
  // } = {};
  // entityNames.forEach((entityName) => {
  //   entities[entityName] = () => db<Record<string, unknown>>(entityName);
  // });

  // const contracts: { [key: string]: Contract | undefined } = {};
  // sources.forEach((source) => {
  //   const provider = getProviderForChainId(config, source.chainId);
  //   const contract = new Contract(
  //     source.address,
  //     source.abiInterface,
  //     provider
  //   );
  //   contracts[source.name] = contract;
  // });

  // const handlerContext = {
  //   entities: entities,
  //   contracts: contracts,
  // };

  // NOTE: This function should probably come as a standalone param.
  const worker = async (log: Log) => {
    const source = config.sources.find(
      (source) => source.address === log.address
    );
    if (!source) {
      logger.warn(`Source not found for log with address: ${log.address}`);
      return;
    }

    const parsedLog = source.abiInterface.parseLog(log);
    const params = { ...parsedLog.args };

    const sourceHandlers = handlers[source.name];
    if (!sourceHandlers) {
      logger.warn(`Handlers not found for source: ${source.name}`);
      return;
    }

    const handler = sourceHandlers[parsedLog.name];
    if (!handler) {
      logger.warn(
        `Handler not found for event: ${source.name}-${parsedLog.name}`
      );
      return;
    }

    const logBlockNumber = BigNumber.from(log.blockNumber).toNumber();
    logger.debug(`Processing ${parsedLog.name} from block ${logBlockNumber}`);

    // TOOD: Add more shit to the event here?
    const event = { ...parsedLog, params: params };

    // YAY: We're running user code here!
    await handler(event);
  };

  return worker;
};

export { buildLogWorker };
export type { LogWorker };
