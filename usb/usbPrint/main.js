var element = document.querySelector("#greeting");
element.innerText = "Hello, world!";
navigator.usb.requestDevice({ filters: [{ vendorId: '04B8'}]}).then( device => {
  console.log( device.productName);
  console.log( device.manufacturerName);
})
.catch( error => { console.log( error );});