const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/stock-levels/low-stock');
    const data = await res.json();
    console.log(JSON.stringify(data.data[0], null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
