const debug = require('debug')('device');
debug('Emulate: H5000 cpu');



// Device address (suggested)
var deviceAddress = 13;

// Track/heading


// AddressClaim PGN
addressClaim = {
  pgn: 60928,
  dst: 255,
  "Unique Number": 1731561,
  "Manufacturer Code": 381,
  "Device Function": 190,
  "Device Class": 60,
  "Device Instance Lower": 0,
  "Device Instance Upper": 0,
  "System Instance": 0,
  "Industry Group": 4,          // Marine
  "Reserved1": 1,
  "Reserved2": 2
}

// Product info PGN
productInfo = {
  pgn: 126996,
  dst: 255,
  "NMEA 2000 Version": 2100,
  "Product Code": 246,
  "Model ID": "H5000 CPU",
  "Software Version Code": "2.0.45.0.29",
  "Model Version": "",
  "Model Serial Code": "005469",
  "Certification Level": 1,
  "Load Equivalency": 1
}

const defaultTransmitPGNs = [
  60928,
  59904,
  59392,
  59904,
  126996 ]

module.exports.defaultTransmitPGNs = defaultTransmitPGNs
