/**
 * Generated by the protoc-gen-ts.  DO NOT EDIT!
 * compiler version: 5.29.3
 * source: src/proto/contract/vote_asset_contract.proto
 * git: https://github.com/thesayyn/protoc-gen-ts */
import * as pb_1 from "google-protobuf";
export namespace protocol {
    export class VoteAssetContract extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            owner_address?: Uint8Array;
            vote_address?: Uint8Array[];
            support?: boolean;
            count?: number;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [2], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("owner_address" in data && data.owner_address != undefined) {
                    this.owner_address = data.owner_address;
                }
                if ("vote_address" in data && data.vote_address != undefined) {
                    this.vote_address = data.vote_address;
                }
                if ("support" in data && data.support != undefined) {
                    this.support = data.support;
                }
                if ("count" in data && data.count != undefined) {
                    this.count = data.count;
                }
            }
        }
        get owner_address() {
            return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
        }
        set owner_address(value: Uint8Array) {
            pb_1.Message.setField(this, 1, value);
        }
        get vote_address() {
            return pb_1.Message.getFieldWithDefault(this, 2, []) as Uint8Array[];
        }
        set vote_address(value: Uint8Array[]) {
            pb_1.Message.setField(this, 2, value);
        }
        get support() {
            return pb_1.Message.getFieldWithDefault(this, 3, false) as boolean;
        }
        set support(value: boolean) {
            pb_1.Message.setField(this, 3, value);
        }
        get count() {
            return pb_1.Message.getFieldWithDefault(this, 5, 0) as number;
        }
        set count(value: number) {
            pb_1.Message.setField(this, 5, value);
        }
        static fromObject(data: {
            owner_address?: Uint8Array;
            vote_address?: Uint8Array[];
            support?: boolean;
            count?: number;
        }): VoteAssetContract {
            const message = new VoteAssetContract({});
            if (data.owner_address != null) {
                message.owner_address = data.owner_address;
            }
            if (data.vote_address != null) {
                message.vote_address = data.vote_address;
            }
            if (data.support != null) {
                message.support = data.support;
            }
            if (data.count != null) {
                message.count = data.count;
            }
            return message;
        }
        toObject() {
            const data: {
                owner_address?: Uint8Array;
                vote_address?: Uint8Array[];
                support?: boolean;
                count?: number;
            } = {};
            if (this.owner_address != null) {
                data.owner_address = this.owner_address;
            }
            if (this.vote_address != null) {
                data.vote_address = this.vote_address;
            }
            if (this.support != null) {
                data.support = this.support;
            }
            if (this.count != null) {
                data.count = this.count;
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.owner_address.length)
                writer.writeBytes(1, this.owner_address);
            if (this.vote_address.length)
                writer.writeRepeatedBytes(2, this.vote_address);
            if (this.support != false)
                writer.writeBool(3, this.support);
            if (this.count != 0)
                writer.writeInt32(5, this.count);
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): VoteAssetContract {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new VoteAssetContract();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.owner_address = reader.readBytes();
                        break;
                    case 2:
                        pb_1.Message.addToRepeatedField(message, 2, reader.readBytes());
                        break;
                    case 3:
                        message.support = reader.readBool();
                        break;
                    case 5:
                        message.count = reader.readInt32();
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): VoteAssetContract {
            return VoteAssetContract.deserialize(bytes);
        }
    }
}
