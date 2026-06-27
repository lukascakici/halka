/** Native XLM (and its SAC) use 7 decimals. */
const DECIMALS = 7n;
const ONE_XLM = 10n ** DECIMALS;

export function xlmToStroops(amount: string | number): bigint {
  const [whole, frac = ""] = String(amount).split(".");
  const fracPadded = (frac + "0000000").slice(0, 7);
  return BigInt(whole || "0") * ONE_XLM + BigInt(fracPadded || "0");
}

export function stroopsToXlm(stroops: bigint): string {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  const whole = abs / ONE_XLM;
  const frac = (abs % ONE_XLM).toString().padStart(7, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}
