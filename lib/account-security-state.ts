export type AccountSecurityState = {
  ok: boolean;
  message: string;
  stage?: "CODE" | "PASSWORD" | "DONE";
  loginPath?: string;
};

export const INITIAL_ACCOUNT_SECURITY_STATE: AccountSecurityState = {
  ok: false,
  message: "",
  stage: "CODE",
};
