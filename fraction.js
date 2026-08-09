/**
 * fraction.js
 * -----------
 * Integer-based fraction arithmetic used by the Faraidh calculation engine.
 * The core inheritance math (asal masalah, awl, radd, tashih) must never
 * rely on JavaScript floating point, since floating point rounding can
 * silently produce a wrong distribution of an estate. Every fraction here
 * is represented as a plain object: { numerator, denominator }.
 */

/** Greatest common divisor (always returns a positive integer). */
function gcd(a, b) {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** Least common multiple. */
function lcm(a, b) {
  a = Math.trunc(a);
  b = Math.trunc(b);
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/** Build a normalized fraction (positive denominator, reduced to lowest terms). */
function makeFraction(numerator, denominator) {
  if (denominator === 0) {
    throw new Error('Penyebut pecahan tidak boleh nol.');
  }
  return simplifyFraction({ numerator, denominator });
}

/** Reduce a fraction to lowest terms with a positive denominator. */
function simplifyFraction(f) {
  let { numerator, denominator } = f;
  if (denominator < 0) {
    numerator = -numerator;
    denominator = -denominator;
  }
  if (numerator === 0) {
    return { numerator: 0, denominator: 1 };
  }
  const g = gcd(numerator, denominator);
  return { numerator: numerator / g, denominator: denominator / g };
}

function addFraction(a, b) {
  return simplifyFraction({
    numerator: a.numerator * b.denominator + b.numerator * a.denominator,
    denominator: a.denominator * b.denominator
  });
}

function subtractFraction(a, b) {
  return simplifyFraction({
    numerator: a.numerator * b.denominator - b.numerator * a.denominator,
    denominator: a.denominator * b.denominator
  });
}

function multiplyFraction(a, b) {
  return simplifyFraction({
    numerator: a.numerator * b.numerator,
    denominator: a.denominator * b.denominator
  });
}

function divideFraction(a, b) {
  if (b.numerator === 0) {
    throw new Error('Tidak dapat membagi dengan pecahan bernilai nol.');
  }
  return simplifyFraction({
    numerator: a.numerator * b.denominator,
    denominator: a.denominator * b.numerator
  });
}

/** -1 if a<b, 0 if equal, 1 if a>b */
function compareFraction(a, b) {
  const left = a.numerator * b.denominator;
  const right = b.numerator * a.denominator;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isZeroFraction(a) {
  return a.numerator === 0;
}

function fractionToDecimal(f) {
  return f.numerator / f.denominator;
}

/** Human readable "a/b" (or plain integer when denominator is 1). */
function fractionToString(f) {
  const s = simplifyFraction(f);
  if (s.denominator === 1) return `${s.numerator}`;
  return `${s.numerator}/${s.denominator}`;
}

/** Convert a fraction of the net estate into a Rupiah-ready integer amount.
 *  Only the FINAL conversion step touches non-integer arithmetic, and it
 *  rounds to the nearest whole currency unit rather than truncating, so
 *  the sum of all rounded shares stays as close as possible to the total. */
function fractionOfAmount(fraction, amount) {
  const raw = (amount * fraction.numerator) / fraction.denominator;
  return Math.round(raw);
}

/** Sum an array of fractions. */
function sumFractions(list) {
  return list.reduce((acc, f) => addFraction(acc, f), { numerator: 0, denominator: 1 });
}

const FR = {
  gcd,
  lcm,
  makeFraction,
  simplifyFraction,
  addFraction,
  subtractFraction,
  multiplyFraction,
  divideFraction,
  compareFraction,
  isZeroFraction,
  fractionToDecimal,
  fractionToString,
  fractionOfAmount,
  sumFractions
};

// Exposed globally (plain <script> files, no bundler, so no ES module import/export
// is used — this keeps the app runnable by opening index.html directly).
window.FR = FR;