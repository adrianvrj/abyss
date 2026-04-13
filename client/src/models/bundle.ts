import { dedupeBy, type PrimitiveValue, toAddress, toBigInt, toBoolean, toNumber } from "@/models/shared";

const MODEL_NAME = "Bundle";

export interface RawBundle {
  id: PrimitiveValue<string>;
  referral_percentage: PrimitiveValue<string>;
  reissuable: PrimitiveValue<boolean | string>;
  price: PrimitiveValue<string>;
  payment_token: PrimitiveValue<string>;
  payment_receiver: PrimitiveValue<string>;
  total_issued: PrimitiveValue<string>;
  created_at: PrimitiveValue<string>;
  metadata: PrimitiveValue<string>;
  contract: PrimitiveValue<string>;
  allower: PrimitiveValue<string>;
}

export class Bundle {
  constructor(
    public id: number,
    public referralPercentage: number,
    public reissuable: boolean,
    public price: bigint,
    public paymentToken: string,
    public paymentReceiver: string,
    public totalIssued: bigint,
    public createdAt: number,
    public metadata: string,
    public contract: string,
    public allower: string,
  ) {}

  static getModelName() {
    return MODEL_NAME;
  }

  static parse(data: RawBundle): Bundle {
    return new Bundle(
      toNumber(data.id),
      toNumber(data.referral_percentage),
      toBoolean(data.reissuable),
      toBigInt(data.price),
      toAddress(data.payment_token),
      toAddress(data.payment_receiver),
      toBigInt(data.total_issued),
      toNumber(data.created_at),
      data.metadata.value,
      toAddress(data.contract),
      toAddress(data.allower),
    );
  }

  static dedupe(items: Bundle[]): Bundle[] {
    return dedupeBy(items, (item) => item.id);
  }
}

export interface RawBundleIssuance {
  bundle_id: PrimitiveValue<string>;
  recipient: PrimitiveValue<string>;
  count: PrimitiveValue<string>;
}

export class BundleIssuance {
  constructor(
    public bundleId: number,
    public recipient: string,
    public count: number,
  ) {}

  static getModelName() {
    return "BundleIssuance";
  }

  static parse(data: RawBundleIssuance): BundleIssuance {
    return new BundleIssuance(
      toNumber(data.bundle_id),
      toAddress(data.recipient),
      toNumber(data.count),
    );
  }
}
