const sharp = require("sharp");
const fs = require("fs");

const input = "public/favicon.svg";
const output = "public/favicon-32x32.png";

sharp(input)
  .resize(32, 32)
  .png()
  .toFile(output)
  .then(() => {
    console.log("Favicon PNG generated:", output);
  })
  .catch((err) => {
    console.error("Error generating PNG favicon:", err);
  });
