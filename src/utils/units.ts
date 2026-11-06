/**
 * TRX <-> sun conversion. 1 TRX = 1,000,000 sun. All conversion is done with
 * BigInt + string parsing so amounts never pass through a lossy IEEE-754 float.
 */

/** Number of sun in one TRX (TRX has 6 decimals). */
export const SUN_PER_TRX = 1_000_000n;
/** Decimal places of TRX. */
export const TRX_DECIMALS = 6;

/** A decimal amount the library accepts from callers. */
export type DecimalLike = number | string | bigint;

const isHugeFloat = (value: number): boolean =>
    !Number.isFinite(value) || Math.abs(value) >= 1e21;

/** `String(value)` with any exponent (`1e-7`) expanded into plain decimal digits. */
const plainDecimal = (value: number): string => {
    const text = String(value);
    const match = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(text);
    if (!match) return text;
    const [, sign, int, frac = '', exp] = match;
    const digits = int + frac;
    const point = int.length + Number(exp);
    if (point <= 0) return `${sign}0.${'0'.repeat(-point)}${digits}`;
    if (point >= digits.length) return `${sign}${digits}${'0'.repeat(point - digits.length)}`;
    return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
};

/**
 * Parse a decimal string/number/bigint into an integer base-unit BigInt for a
 * token with `decimals` decimals. Rejects malformed input and excess precision
 * (more fractional digits than the token supports) rather than silently
 * truncating value.
 */
export const toBaseUnits = (value: DecimalLike, decimals: number = TRX_DECIMALS): bigint => {
    const scale = 10n ** BigInt(decimals);

    if (typeof value === 'bigint') return value * scale;

    let text: string;
    if (typeof value === 'number') {
        if (isHugeFloat(value)) throw new Error(`Amount out of safe range: ${value}`);
        // The shortest decimal that round-trips to this float — what the caller
        // wrote. (`toFixed` would round 0.1234567 to 6 places, and pad 0.1 at 18
        // decimals with the float's binary noise: 0.100000000000000006.)
        text = plainDecimal(value);
    } else {
        text = value.trim();
    }

    if (!/^-?\d*(\.\d*)?$/.test(text) || text === '' || text === '.' || text === '-') {
        throw new Error(`Invalid decimal amount: ${value}`);
    }

    const negative = text.startsWith('-');
    if (negative) text = text.slice(1);

    const [whole = '0', fraction = ''] = text.split('.');
    if (fraction.length > decimals) {
        throw new Error(
            `Amount ${value} has more than ${decimals} decimal places (token precision)`
        );
    }

    const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals);
    const result = BigInt(whole || '0') * scale + BigInt(padded || '0');
    return negative ? -result : result;
};

/** Convert a base-unit integer to a trimmed decimal string for `decimals`. */
export const fromBaseUnits = (value: bigint | string | number, decimals: number = TRX_DECIMALS): string => {
    const v = typeof value === 'bigint' ? value : BigInt(String(value).trim());
    const scale = 10n ** BigInt(decimals);
    const negative = v < 0n;
    const abs = negative ? -v : v;
    const whole = abs / scale;
    const fraction = (abs % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
    const text = fraction ? `${whole}.${fraction}` : `${whole}`;
    return negative ? `-${text}` : text;
};

/** Convert a TRX decimal amount to an integer sun BigInt. */
export const trxToSun = (trx: DecimalLike): bigint => toBaseUnits(trx, TRX_DECIMALS);

/** Convert a sun amount to a trimmed TRX decimal string. */
export const sunToTrx = (sun: bigint | string | number): string => fromBaseUnits(sun, TRX_DECIMALS);
