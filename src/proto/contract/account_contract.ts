/**
 * Generated by the protoc-gen-ts.  DO NOT EDIT!
 * compiler version: 5.29.3
 * source: src/proto/contract/account_contract.proto
 * git: https://github.com/thesayyn/protoc-gen-ts */
import * as dependency_1 from "./../Tron";
import * as pb_1 from "google-protobuf";
export namespace protocol {
    export class AccountCreateContract extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            owner_address?: Uint8Array;
            account_address?: Uint8Array;
            type?: dependency_1.protocol.AccountType;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("owner_address" in data && data.owner_address != undefined) {
                    this.owner_address = data.owner_address;
                }
                if ("account_address" in data && data.account_address != undefined) {
                    this.account_address = data.account_address;
                }
                if ("type" in data && data.type != undefined) {
                    this.type = data.type;
                }
            }
        }
        get owner_address() {
            return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
        }
        set owner_address(value: Uint8Array) {
            pb_1.Message.setField(this, 1, value);
        }
        get account_address() {
            return pb_1.Message.getFieldWithDefault(this, 2, new Uint8Array(0)) as Uint8Array;
        }
        set account_address(value: Uint8Array) {
            pb_1.Message.setField(this, 2, value);
        }
        get type() {
            return pb_1.Message.getFieldWithDefault(this, 3, dependency_1.protocol.AccountType.Normal) as dependency_1.protocol.AccountType;
        }
        set type(value: dependency_1.protocol.AccountType) {
            pb_1.Message.setField(this, 3, value);
        }
        static fromObject(data: {
            owner_address?: Uint8Array;
            account_address?: Uint8Array;
            type?: dependency_1.protocol.AccountType;
        }): AccountCreateContract {
            const message = new AccountCreateContract({});
            if (data.owner_address != null) {
                message.owner_address = data.owner_address;
            }
            if (data.account_address != null) {
                message.account_address = data.account_address;
            }
            if (data.type != null) {
                message.type = data.type;
            }
            return message;
        }
        toObject() {
            const data: {
                owner_address?: Uint8Array;
                account_address?: Uint8Array;
                type?: dependency_1.protocol.AccountType;
            } = {};
            if (this.owner_address != null) {
                data.owner_address = this.owner_address;
            }
            if (this.account_address != null) {
                data.account_address = this.account_address;
            }
            if (this.type != null) {
                data.type = this.type;
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.owner_address.length)
                writer.writeBytes(1, this.owner_address);
            if (this.account_address.length)
                writer.writeBytes(2, this.account_address);
            if (this.type != dependency_1.protocol.AccountType.Normal)
                writer.writeEnum(3, this.type);
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): AccountCreateContract {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new AccountCreateContract();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.owner_address = reader.readBytes();
                        break;
                    case 2:
                        message.account_address = reader.readBytes();
                        break;
                    case 3:
                        message.type = reader.readEnum();
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): AccountCreateContract {
            return AccountCreateContract.deserialize(bytes);
        }
    }
    export class AccountUpdateContract extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            account_name?: Uint8Array;
            owner_address?: Uint8Array;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("account_name" in data && data.account_name != undefined) {
                    this.account_name = data.account_name;
                }
                if ("owner_address" in data && data.owner_address != undefined) {
                    this.owner_address = data.owner_address;
                }
            }
        }
        get account_name() {
            return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
        }
        set account_name(value: Uint8Array) {
            pb_1.Message.setField(this, 1, value);
        }
        get owner_address() {
            return pb_1.Message.getFieldWithDefault(this, 2, new Uint8Array(0)) as Uint8Array;
        }
        set owner_address(value: Uint8Array) {
            pb_1.Message.setField(this, 2, value);
        }
        static fromObject(data: {
            account_name?: Uint8Array;
            owner_address?: Uint8Array;
        }): AccountUpdateContract {
            const message = new AccountUpdateContract({});
            if (data.account_name != null) {
                message.account_name = data.account_name;
            }
            if (data.owner_address != null) {
                message.owner_address = data.owner_address;
            }
            return message;
        }
        toObject() {
            const data: {
                account_name?: Uint8Array;
                owner_address?: Uint8Array;
            } = {};
            if (this.account_name != null) {
                data.account_name = this.account_name;
            }
            if (this.owner_address != null) {
                data.owner_address = this.owner_address;
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.account_name.length)
                writer.writeBytes(1, this.account_name);
            if (this.owner_address.length)
                writer.writeBytes(2, this.owner_address);
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): AccountUpdateContract {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new AccountUpdateContract();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.account_name = reader.readBytes();
                        break;
                    case 2:
                        message.owner_address = reader.readBytes();
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): AccountUpdateContract {
            return AccountUpdateContract.deserialize(bytes);
        }
    }
    export class SetAccountIdContract extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            account_id?: Uint8Array;
            owner_address?: Uint8Array;
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("account_id" in data && data.account_id != undefined) {
                    this.account_id = data.account_id;
                }
                if ("owner_address" in data && data.owner_address != undefined) {
                    this.owner_address = data.owner_address;
                }
            }
        }
        get account_id() {
            return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
        }
        set account_id(value: Uint8Array) {
            pb_1.Message.setField(this, 1, value);
        }
        get owner_address() {
            return pb_1.Message.getFieldWithDefault(this, 2, new Uint8Array(0)) as Uint8Array;
        }
        set owner_address(value: Uint8Array) {
            pb_1.Message.setField(this, 2, value);
        }
        static fromObject(data: {
            account_id?: Uint8Array;
            owner_address?: Uint8Array;
        }): SetAccountIdContract {
            const message = new SetAccountIdContract({});
            if (data.account_id != null) {
                message.account_id = data.account_id;
            }
            if (data.owner_address != null) {
                message.owner_address = data.owner_address;
            }
            return message;
        }
        toObject() {
            const data: {
                account_id?: Uint8Array;
                owner_address?: Uint8Array;
            } = {};
            if (this.account_id != null) {
                data.account_id = this.account_id;
            }
            if (this.owner_address != null) {
                data.owner_address = this.owner_address;
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.account_id.length)
                writer.writeBytes(1, this.account_id);
            if (this.owner_address.length)
                writer.writeBytes(2, this.owner_address);
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): SetAccountIdContract {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new SetAccountIdContract();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.account_id = reader.readBytes();
                        break;
                    case 2:
                        message.owner_address = reader.readBytes();
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): SetAccountIdContract {
            return SetAccountIdContract.deserialize(bytes);
        }
    }
    export class AccountPermissionUpdateContract extends pb_1.Message {
        #one_of_decls: number[][] = [];
        constructor(data?: any[] | {
            owner_address?: Uint8Array;
            owner?: dependency_1.protocol.Permission;
            witness?: dependency_1.protocol.Permission;
            actives?: dependency_1.protocol.Permission[];
        }) {
            super();
            pb_1.Message.initialize(this, Array.isArray(data) ? data : [], 0, -1, [4], this.#one_of_decls);
            if (!Array.isArray(data) && typeof data == "object") {
                if ("owner_address" in data && data.owner_address != undefined) {
                    this.owner_address = data.owner_address;
                }
                if ("owner" in data && data.owner != undefined) {
                    this.owner = data.owner;
                }
                if ("witness" in data && data.witness != undefined) {
                    this.witness = data.witness;
                }
                if ("actives" in data && data.actives != undefined) {
                    this.actives = data.actives;
                }
            }
        }
        get owner_address() {
            return pb_1.Message.getFieldWithDefault(this, 1, new Uint8Array(0)) as Uint8Array;
        }
        set owner_address(value: Uint8Array) {
            pb_1.Message.setField(this, 1, value);
        }
        get owner() {
            return pb_1.Message.getWrapperField(this, dependency_1.protocol.Permission, 2) as dependency_1.protocol.Permission;
        }
        set owner(value: dependency_1.protocol.Permission) {
            pb_1.Message.setWrapperField(this, 2, value);
        }
        get has_owner() {
            return pb_1.Message.getField(this, 2) != null;
        }
        get witness() {
            return pb_1.Message.getWrapperField(this, dependency_1.protocol.Permission, 3) as dependency_1.protocol.Permission;
        }
        set witness(value: dependency_1.protocol.Permission) {
            pb_1.Message.setWrapperField(this, 3, value);
        }
        get has_witness() {
            return pb_1.Message.getField(this, 3) != null;
        }
        get actives() {
            return pb_1.Message.getRepeatedWrapperField(this, dependency_1.protocol.Permission, 4) as dependency_1.protocol.Permission[];
        }
        set actives(value: dependency_1.protocol.Permission[]) {
            pb_1.Message.setRepeatedWrapperField(this, 4, value);
        }
        static fromObject(data: {
            owner_address?: Uint8Array;
            owner?: ReturnType<typeof dependency_1.protocol.Permission.prototype.toObject>;
            witness?: ReturnType<typeof dependency_1.protocol.Permission.prototype.toObject>;
            actives?: ReturnType<typeof dependency_1.protocol.Permission.prototype.toObject>[];
        }): AccountPermissionUpdateContract {
            const message = new AccountPermissionUpdateContract({});
            if (data.owner_address != null) {
                message.owner_address = data.owner_address;
            }
            if (data.owner != null) {
                message.owner = dependency_1.protocol.Permission.fromObject(data.owner);
            }
            if (data.witness != null) {
                message.witness = dependency_1.protocol.Permission.fromObject(data.witness);
            }
            if (data.actives != null) {
                message.actives = data.actives.map(item => dependency_1.protocol.Permission.fromObject(item));
            }
            return message;
        }
        toObject() {
            const data: {
                owner_address?: Uint8Array;
                owner?: ReturnType<typeof dependency_1.protocol.Permission.prototype.toObject>;
                witness?: ReturnType<typeof dependency_1.protocol.Permission.prototype.toObject>;
                actives?: ReturnType<typeof dependency_1.protocol.Permission.prototype.toObject>[];
            } = {};
            if (this.owner_address != null) {
                data.owner_address = this.owner_address;
            }
            if (this.owner != null) {
                data.owner = this.owner.toObject();
            }
            if (this.witness != null) {
                data.witness = this.witness.toObject();
            }
            if (this.actives != null) {
                data.actives = this.actives.map((item: dependency_1.protocol.Permission) => item.toObject());
            }
            return data;
        }
        serialize(): Uint8Array;
        serialize(w: pb_1.BinaryWriter): void;
        serialize(w?: pb_1.BinaryWriter): Uint8Array | void {
            const writer = w || new pb_1.BinaryWriter();
            if (this.owner_address.length)
                writer.writeBytes(1, this.owner_address);
            if (this.has_owner)
                writer.writeMessage(2, this.owner, () => this.owner.serialize(writer));
            if (this.has_witness)
                writer.writeMessage(3, this.witness, () => this.witness.serialize(writer));
            if (this.actives.length)
                writer.writeRepeatedMessage(4, this.actives, (item: dependency_1.protocol.Permission) => item.serialize(writer));
            if (!w)
                return writer.getResultBuffer();
        }
        static deserialize(bytes: Uint8Array | pb_1.BinaryReader): AccountPermissionUpdateContract {
            const reader = bytes instanceof pb_1.BinaryReader ? bytes : new pb_1.BinaryReader(bytes), message = new AccountPermissionUpdateContract();
            while (reader.nextField()) {
                if (reader.isEndGroup())
                    break;
                switch (reader.getFieldNumber()) {
                    case 1:
                        message.owner_address = reader.readBytes();
                        break;
                    case 2:
                        reader.readMessage(message.owner, () => message.owner = dependency_1.protocol.Permission.deserialize(reader));
                        break;
                    case 3:
                        reader.readMessage(message.witness, () => message.witness = dependency_1.protocol.Permission.deserialize(reader));
                        break;
                    case 4:
                        reader.readMessage(message.actives, () => pb_1.Message.addToRepeatedWrapperField(message, 4, dependency_1.protocol.Permission.deserialize(reader), dependency_1.protocol.Permission));
                        break;
                    default: reader.skipField();
                }
            }
            return message;
        }
        serializeBinary(): Uint8Array {
            return this.serialize();
        }
        static deserializeBinary(bytes: Uint8Array): AccountPermissionUpdateContract {
            return AccountPermissionUpdateContract.deserialize(bytes);
        }
    }
}
