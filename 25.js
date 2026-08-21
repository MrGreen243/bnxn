function buyBreads() {
            const buttons = document.querySelectorAll(
  'button[onclick*="orderViaWhatsApp"]'
);

buttons.forEach((button, i) => {
  const clone = button.cloneNode(true);

  console.log(`button ${i}`, clone);

  // Read the original onclick
  console.log(clone.getAttribute('onclick'));

  // Example: replace the onclick
  clone.setAttribute(
    'onclick',
    "orderViaWhatsApp('2349131654821', 'Happiness')"
  );

  // Replace the original
  button.replaceWith(clone);
    console.log("done replacing")
});
}


buyBreads()
