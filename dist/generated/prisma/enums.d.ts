export declare const UserStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly DISABLED: "DISABLED";
    readonly LOCKED: "LOCKED";
};
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
