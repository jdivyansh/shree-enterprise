
// Amount to words (Indian system)
function amountToWords(amount) {
  const oneToNineteen = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tensNames = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function twoDigit(n){
    if (n < 20) return oneToNineteen[n];
    return tensNames[Math.floor(n/10)] + (n%10 ? ' ' + oneToNineteen[n%10] : '');
  }
  function threeDigit(n){
    let str = '';
    if (n > 99) {
      str += oneToNineteen[Math.floor(n/100)] + ' hundred';
      if (n%100) str += ' and ';
    }
    if (n%100) str += twoDigit(n%100);
    return str;
  }
  function inWords(n) {
    let result = '';
    if (n >= 10000000) { result += inWords(Math.floor(n/10000000)) + ' crore '; n = n % 10000000; }
    if (n >= 100000) { result += inWords(Math.floor(n/100000)) + ' lakh '; n = n % 100000; }
    if (n >= 1000) { result += inWords(Math.floor(n/1000)) + ' thousand '; n = n % 1000; }
    if (n > 0) { result += threeDigit(n); }
    return result.trim();
  }
  let rupees = Math.floor(amount);
  let paise = Math.round((amount - rupees) * 100);
  let words = '';
  if (rupees > 0) words += inWords(rupees) + ' rupees';
  if (paise > 0) words += (words ? ' and ' : '') + inWords(paise) + ' paise';
  if (!words) words = 'zero rupees';
  return words + ' only';
}

// Invoice logic
document.addEventListener('DOMContentLoaded', () => {
  const itemsBody = document.getElementById('itemsBody');
  const addItemBtn = document.getElementById('addItem');
  const printBtn = document.getElementById('printBtn');
  const taxableEl = document.getElementById('taxable');
  const cgstEl = document.getElementById('cgst');
  const sgstEl = document.getElementById('sgst');
  const grandEl = document.getElementById('grandTotal');
  const inWordsEl = document.getElementById('inWords');
  const invoiceDate = document.getElementById('invoiceDate');

  invoiceDate.valueAsDate = new Date();

  function recalc() {
    let taxable = 0;
    const rows = Array.from(itemsBody.querySelectorAll('tr'));
    rows.forEach((row, idx) => {
      row.querySelector('.idx').textContent = idx+1;
      const qty = parseFloat(row.querySelector('.qty').value) || 0;
      const rate = parseFloat(row.querySelector('.rate').value) || 0;
      const amount = qty * rate;
      row.querySelector('.amount').textContent = amount.toFixed(2);
      taxable += amount;
    });
    const cgst = taxable * 0.09;
    const sgst = taxable * 0.09;
    const grand = taxable + cgst + sgst;

    taxableEl.textContent = taxable.toFixed(2);
    cgstEl.textContent = cgst.toFixed(2);
    sgstEl.textContent = sgst.toFixed(2);
    grandEl.textContent = grand.toFixed(2);
    inWordsEl.textContent = amountToWords(grand);
  }

  recalc();

  addItemBtn.addEventListener('click', () => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="idx"></td>
      <td><input class="desc" placeholder="Item description"></td>
      <td><input class="hsn" placeholder=""></td>
      <td><input class="qty" type="number" min="0" value="1"></td>
      <td><input class="unit" value="pcs"></td>
      <td><input class="rate" type="number" min="0" value="0"></td>
      <td class="amount">0.00</td>
      <td><button class="del">❌</button></td>
    `;
    itemsBody.appendChild(tr);
    tr.querySelector('.qty').addEventListener('input', recalc);
    tr.querySelector('.rate').addEventListener('input', recalc);
    tr.querySelector('.del').addEventListener('click', () => { tr.remove(); recalc(); });
    recalc();
  });

  itemsBody.querySelectorAll('tr').forEach(tr => {
    tr.querySelector('.qty').addEventListener('input', recalc);
    tr.querySelector('.rate').addEventListener('input', recalc);
    tr.querySelector('.del').addEventListener('click', () => { tr.remove(); recalc(); });
  });

  document.getElementById('itemsTable').addEventListener('input', recalc);

  printBtn.addEventListener('click', () => {
    recalc();
    window.print();
  });
});
