/**
 * Generated by the protoc-gen-ts.  DO NOT EDIT!
 * compiler version: 5.29.3
 * source: src/proto/contract/witness_contract.proto
 * git: https://github.com/thesayyn/protoc-gen-ts */
import * as pb_1 from "google-protobuf";
export namespace protocol {
    export class WitnessCreateContract extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            owner_address?: Uint8Array;
            url?: Uint8Array;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("owner_address" in data && data.owner_address != undefined) {
                    this.owner_address = data.owner_address;
                }
                if ("url" in data && data.url != undefined) {
                    this.url = data.url;
                }
            }
        }
        get owner_address() {
            return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
        }
        set owner_address(value: Uint8Array) {
            pb_1.Message.setField(this, 1, value);
        }
        get url() {
            return pb_1.Message.getFieldWithDefault(this, 2, new Uint8Array(0)) as Uint8Array;
        }
        set url(value: Uint8Array) {
            pb_1.Message.setField(this, 2, value);
        }
        static fromObject(data: {
            owner_address?: Uint8Array;
            url?: Uint8Array;
        }): WitnessCreateContract {
            const message = new WitnessCreateContract({});
            if (data.owner_address != null) {
                message.owner_address = data.owner_address;
            }
            if (data.url != null) {
                message.url = data.url;
            }
            return message;
        }
        toObject() {
            const data: {
                owner_address?: Uint8Array;
                url?: Uint8Array;
            } = {};
            if (this.owner_address != null) {
                data.owner_address = this.owner_address;
            }
            if (this.url != null) {
                data.url = this.url;
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.owner_address.length)
                writer.writeBytes(1, this.owner_address);
            if (this.url.length)
                writer.writeBytes(2, this.url);
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): WitnessCreateContract {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new WitnessCreateContract();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.owner_address = reader.readBytes();
                        break;
                    case 2:
                        message.url = reader.readBytes();
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): WitnessCreateContract {
            return WitnessCreateContract.deserialize(bytes);
        }
    }
    export class WitnessUpdateContract extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            owner_address?: Uint8Array;
            update_url?: Uint8Array;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("owner_address" in data && data.owner_address != undefined) {
                    this.owner_address = data.owner_address;
                }
                if ("update_url" in data && data.update_url != undefined) {
                    this.update_url = data.update_url;
                }
            }
        }
        get owner_address() {
            return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
        }
        set owner_address(value: Uint8Array) {
            pb_1.Message.setField(this, 1, value);
        }
        get update_url() {
            return pb_1.Message.getFieldWithDefault(this, 12, new Uint8Array(0)) as Uint8Array;
        }
        set update_url(value: Uint8Array) {
            pb_1.Message.setField(this, 12, value);
        }
        static fromObject(data: {
            owner_address?: Uint8Array;
            update_url?: Uint8Array;
        }): WitnessUpdateContract {
            const message = new WitnessUpdateContract({});
            if (data.owner_address != null) {
                message.owner_address = data.owner_address;
            }
            if (data.update_url != null) {
                message.update_url = data.update_url;
            }
            return message;
        }
        toObject() {
            const data: {
                owner_address?: Uint8Array;
                update_url?: Uint8Array;
            } = {};
            if (this.owner_address != null) {
                data.owner_address = this.owner_address;
            }
            if (this.update_url != null) {
                data.update_url = this.update_url;
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.owner_address.length)
                writer.writeBytes(1, this.owner_address);
            if (this.update_url.length)
                writer.writeBytes(12, this.update_url);
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): WitnessUpdateContract {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new WitnessUpdateContract();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.owner_address = reader.readBytes();
                        break;
                    case 12:
                        message.update_url = reader.readBytes();
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): WitnessUpdateContract {
            return WitnessUpdateContract.deserialize(bytes);
        }
    }
    export class VoteWitnessContract extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            owner_address?: Uint8Array;
            votes?: VoteWitnessContract.Vote[];
            support?: boolean;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [2], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("owner_address" in data && data.owner_address != undefined) {
                    this.owner_address = data.owner_address;
                }
                if ("votes" in data && data.votes != undefined) {
                    this.votes = data.votes;
                }
                if ("support" in data && data.support != undefined) {
                    this.support = data.support;
                }
            }
        }
        get owner_address() {
            return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
        }
        set owner_address(value: Uint8Array) {
            pb_1.Message.setField(this, 1, value);
        }
        get votes() {
            return pb_1.Message.getRepeatedWrapperField(this, VoteWitnessContract.Vote, 2) as VoteWitnessContract.Vote[];
        }
        set votes(value: VoteWitnessContract.Vote[]) {
            pb_1.Message.setRepeatedWrapperField(this, 2, value);
        }
        get support() {
            return pb_1.Message.getFieldWithDefault(this, 3, false) as boolean;
        }
        set support(value: boolean) {
            pb_1.Message.setField(this, 3, value);
        }
        static fromObject(data: {
            owner_address?: Uint8Array;
            votes?: ReturnType<typeof VoteWitnessContract.Vote.prototype.toObject>[];
            support?: boolean;
        }): VoteWitnessContract {
            const message = new VoteWitnessContract({});
            if (data.owner_address != null) {
                message.owner_address = data.owner_address;
            }
            if (data.votes != null) {
                message.votes = data.votes.map(item => VoteWitnessContract.Vote.fromObject(item));
            }
            if (data.support != null) {
                message.support = data.support;
            }
            return message;
        }
        toObject() {
            const data: {
                owner_address?: Uint8Array;
                votes?: ReturnType<typeof VoteWitnessContract.Vote.prototype.toObject>[];
                support?: boolean;
            } = {};
            if (this.owner_address != null) {
                data.owner_address = this.owner_address;
            }
            if (this.votes != null) {
                data.votes = this.votes.map((item: VoteWitnessContract.Vote) => item.toObject());
            }
            if (this.support != null) {
                data.support = this.support;
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.owner_address.length)
                writer.writeBytes(1, this.owner_address);
            if (this.votes.length)
                writer.writeRepeatedMessage(2, this.votes, (item: VoteWitnessContract.Vote) => item.serialize(writer));
            if (this.support != false)
                writer.writeBool(3, this.support);
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): VoteWitnessContract {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new VoteWitnessContract();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.owner_address = reader.readBytes();
                        break;
                    case 2:
                        reader.readMessage(message.votes, () => pb_1.Message.addToRepeatedWrapperField(message, 2, VoteWitnessContract.Vote.deserialize(reader), VoteWitnessContract.Vote));
                        break;
                    case 3:
                        message.support = reader.readBool();
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): VoteWitnessContract {
            return VoteWitnessContract.deserialize(bytes);
        }
    }
    export namespace VoteWitnessContract {
        export class Vote extends pb_1.Message {
            #one_of_decls: number[][] = [];
            constructor(data?: any[] | {
                vote_address?: Uint8Array;
                vote_count?: number;
            }) {
                super();
                pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [], this.#one_of_decls);
                if (!Array.isArray(data) && typeof data == "object") {
                    if ("vote_address" in data && data.vote_address != undefined) {
                        this.vote_address = data.vote_address;
                    }
                    if ("vote_count" in data && data.vote_count != undefined) {
                        this.vote_count = data.vote_count;
                    }
                }
            }
            get vote_address() {
                return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
            }
            set vote_address(value: Uint8Array) {
                pb_1.Message.setField(this, 1, value);
            }
            get vote_count() {
                return pb_1.Message.getFieldWithDefault(this, 2, 0) as number;
            }
            set vote_count(value: number) {
                pb_1.Message.setField(this, 2, value);
            }
            static fromObject(data: {
                vote_address?: Uint8Array;
                vote_count?: number;
            }): Vote {
                const message = new Vote({});
                if (data.vote_address != null) {
                    message.vote_address = data.vote_address;
                }
                if (data.vote_count != null) {
                    message.vote_count = data.vote_count;
                }
                return message;
            }
            toObject() {
                const data: {
                    vote_address?: Uint8Array;
                    vote_count?: number;
                } = {};
                if (this.vote_address != null) {
                    data.vote_address = this.vote_address;
                }
                if (this.vote_count != null) {
                    data.vote_count = this.vote_count;
                }
                return data;
            }
            serialize(): Uint8Array;
            serialize(w: pb_1.BinaryWriter): void;
            serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
                const writer = w || new pb_1.BinaryWriter();
                if (this.vote_address.length)
                    writer.writeBytes(1, this.vote_address);
                if (this.vote_count != 0)
                    writer.writeInt64(2, this.vote_count);
                if (!w)
                    return writer.getResultBuffer();
            }
            static deserialize(bytes: Uint8Array | pb_1.BinaryReader): Vote {
                const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new Vote();
                while (reader.nextField()) {
                    if (reader.isEndGroup())
                        break;
                    switch (reader.getFieldNumber()) {
                        case 1:
                            message.vote_address = reader.readBytes();
                            break;
                        case 2:
                            message.vote_count = reader.readInt64();
                            break;
                        default: reader.skipField();
                    }
                }
                return message;
            }
            serializeBinary(): Uint8Array {
                return this.serialize();
            }
            static deserializeBinary(bytes: Uint8Array): Vote {
                return Vote.deserialize(bytes);
            }
        }
    }
}
