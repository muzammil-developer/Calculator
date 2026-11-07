/* ============================================================
   CALCULATOR LOGIC
   ============================================================ */
(() => {
  'use strict';

  /* ---------- DOM ---------- */
  const displayEl    = document.getElementById('display');
  const expressionEl = document.getElementById('expression');
  const keysEl       = document.getElementById('keys');

  /* ---------- State ---------- */
  const state = {
    current:       '0',    // current number as raw string
    previous:      null,   // stored left-hand operand (NUMBER)
    operator:      null,   // '+', '−', '×', '÷'
    resetNext:     false,  // next digit should replace `current`
    justEvaluated: false,  // last action was "="
    expression:    ''      // small history line
  };

  const MAX_DIGITS = 12;

  /* ---------- Math ---------- */
  function compute(a, b, op) {
    let r;
    switch (op) {
      case '+': r = a + b; break;
      case '−': r = a - b; break;
      case '×': r = a * b; break;
      case '÷':
        if (b === 0) return NaN;
        r = a / b;
        break;
      default: return b;
    }
    if (!isFinite(r)) return r;
    // strip floating-point noise (0.1 + 0.2 → 0.3)
    return parseFloat(r.toPrecision(12));
  }

  /* ---------- Formatting ---------- */
  function format(str) {
    // ✅ FIX: normalize any input to a string before calling string methods
    str = String(str);

    if (str === 'Error' || str === '') return str;
    if (/e/i.test(str)) return str;           // scientific notation — leave as is

    const neg = str.startsWith('-');
    const raw = neg ? str.slice(1) : str;
    const [int, dec] = raw.split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + grouped + (dec !== undefined ? '.' + dec : '');
  }

  function render() {
    const text = format(state.current);
    displayEl.textContent = text;

    // auto-shrink for long numbers
    const len = text.length;
    displayEl.classList.toggle('calc__result--sm', len > 11 && len <= 15);
    displayEl.classList.toggle('calc__result--xs', len > 15);

    expressionEl.innerHTML = state.expression || '&nbsp;';
  }

  /* ---------- Actions ---------- */
  function inputDigit(d) {
    if (state.justEvaluated) {
      state.current = '0';
      state.expression = '';
      state.justEvaluated = false;
    }
    if (state.resetNext) {
      state.current = '0';
      state.resetNext = false;
    }

    if (state.current === '0') {
      state.current = d;
    } else {
      const digits = state.current.replace('-', '').replace('.', '');
      if (digits.length >= MAX_DIGITS) return;
      state.current += d;
    }
    render();
  }

  function inputDecimal() {
    if (state.justEvaluated) {
      state.current = '0';
      state.expression = '';
      state.justEvaluated = false;
    }
    if (state.resetNext) {
      state.current = '0';
      state.resetNext = false;
    }
    if (!state.current.includes('.')) state.current += '.';
    render();
  }

  function chooseOperator(op) {
    if (state.current === 'Error') return;

    // After "=" → start fresh chain from result
    if (state.justEvaluated) {
      state.previous  = parseFloat(state.current);
      state.operator  = op;
      state.resetNext = true;
      state.justEvaluated = false;
      state.expression = `${format(state.previous)} ${op}`;
      render();
      return;
    }

    // User pressed operator twice → just swap it
    if (state.operator && state.resetNext) {
      state.operator = op;
      state.expression = `${format(state.previous)} ${op}`;
      render();
      return;
    }

    // Chained calculation: 5 + 3 + → compute 8, then wait for next
    if (state.operator !== null && state.previous !== null) {
      const result = compute(state.previous, parseFloat(state.current), state.operator);
      if (!isFinite(result)) { handleError(); return; }
      state.previous = result;
      state.current  = String(result);
    } else {
      state.previous = parseFloat(state.current);
    }

    state.operator  = op;
    state.resetNext = true;
    state.expression = `${format(state.previous)} ${op}`;
    render();
  }

  function equals() {
    if (state.operator === null || state.previous === null) return;

    const a  = state.previous;
    const b  = parseFloat(state.current);
    const op = state.operator;
    const result = compute(a, b, op);

    if (!isFinite(result)) { handleError(); return; }

    state.expression = `${format(a)} ${op} ${format(b)} =`;
    state.current    = String(result);
    state.previous   = null;
    state.operator   = null;
    state.resetNext  = true;
    state.justEvaluated = true;
    render();
  }

  function clearAll() {
    state.current   = '0';
    state.previous  = null;
    state.operator  = null;
    state.resetNext = false;
    state.justEvaluated = false;
    state.expression = '';
    render();
  }

  function backspace() {
    if (state.justEvaluated) { clearAll(); return; }
    if (state.resetNext) return;

    if (
      state.current.length <= 1 ||
      (state.current.length === 2 && state.current.startsWith('-'))
    ) {
      state.current = '0';
    } else {
      state.current = state.current.slice(0, -1);
    }
    render();
  }

  function toggleSign() {
    if (state.current === '0' || state.current === 'Error') return;
    state.current = state.current.startsWith('-')
      ? state.current.slice(1)
      : '-' + state.current;
    render();
  }

  function percent() {
    if (state.current === 'Error') return;
    const val = parseFloat(state.current);
    if (isNaN(val)) return;

    let result;
    if (
      state.operator !== null &&
      state.previous !== null &&
      (state.operator === '+' || state.operator === '−')
    ) {
      // 200 + 10% → 200 + 20
      result = (state.previous * val) / 100;
    } else {
      // 50% → 0.5
      result = val / 100;
    }

    state.current = String(parseFloat(result.toPrecision(12)));
    state.resetNext = true;
    render();
  }

  function handleError() {
    state.current   = 'Error';
    state.previous  = null;
    state.operator  = null;
    state.resetNext = true;
    state.justEvaluated = true;
    state.expression = '';
    render();
  }

  /* ---------- Click handling ---------- */
  keysEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.digit !== undefined) return inputDigit(btn.dataset.digit);
    if (btn.dataset.op)                  return chooseOperator(btn.dataset.op);

    switch (btn.dataset.action) {
      case 'clear':     clearAll();     break;
      case 'backspace': backspace();    break;
      case 'percent':   percent();      break;
      case 'sign':      toggleSign();   break;
      case 'decimal':   inputDecimal(); break;
      case 'equals':    equals();       break;
    }
  });

  /* ---------- Keyboard handling ---------- */
  function flash(key) {
    const btn = keysEl.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (!btn) return;
    btn.classList.add('is-active');
    setTimeout(() => btn.classList.remove('is-active'), 120);
  }

  document.addEventListener('keydown', (e) => {
    const k = e.key;

    if (/^[0-9]$/.test(k)) {
      inputDigit(k); flash(k); e.preventDefault(); return;
    }
    if (k === '.' || k === ',') {
      inputDecimal(); flash('.'); e.preventDefault(); return;
    }
    if (k === '+') { chooseOperator('+'); flash('+'); e.preventDefault(); return; }
    if (k === '-') { chooseOperator('−'); flash('−'); e.preventDefault(); return; }
    if (k === '*' || k === 'x' || k === 'X') {
      chooseOperator('×'); flash('×'); e.preventDefault(); return;
    }
    if (k === '/') {
      chooseOperator('÷'); flash('÷'); e.preventDefault(); return;
    }
    if (k === 'Enter' || k === '=') {
      equals(); flash('='); e.preventDefault(); return;
    }
    if (k === 'Backspace') {
      backspace(); flash('⌫'); e.preventDefault(); return;
    }
    if (k === 'Escape' || k === 'c' || k === 'C' || k === 'Delete') {
      clearAll(); flash('AC'); e.preventDefault(); return;
    }
    if (k === '%') {
      percent(); flash('%'); e.preventDefault(); return;
    }
  });

  /* ---------- Init ---------- */
  render();
})();