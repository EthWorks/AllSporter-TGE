require("babel-register")({
  ignore: /node_modules(?!\/zeppelin-solidity)/,
  presets: [
    ["env", {
      "targets" : {
        "node" : "8.0"
      }
    }]
  ],
  retainLines: true,
});
require("babel-polyfill");


module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
      gas: 4712388
    }
  }
};

