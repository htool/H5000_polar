const debug = require('debug')('emulate')

var myArgs = process.argv.slice(2);
const emulate = myArgs[0] || 'H5000'
const emulate_init = './device/' + emulate + '.js'

// Load device specific init info
debug('Loading %s', emulate_init)
require(emulate_init)
const defaultTransmitPGNs = require(emulate_init).defaultTransmitPGNs
module.exports.defaultTransmitPGNs = defaultTransmitPGNs

const deviceAddress = myArgs[1];
//  const deviceAddress = require(emulate_init).deviceAddress;
module.exports.deviceAddress = deviceAddress;

debug('deviceAddress: %j', deviceAddress)

require('./canboatjs')
require('./canboatjs/lib/canbus')
const canDevice = require('./canboatjs/lib/canbus').canDevice
const canbus = new (require('./canboatjs').canbus)({})
const util = require('util')

if (debug) {
  debug('DEBUG enabled. Using keyboard input for state changes.')
	const readline = require('readline');
	readline.emitKeypressEvents(process.stdin);
	process.stdin.setRawMode(true);
	process.stdin.on('keypress', (str, key) => {
	  if (key.ctrl && key.name === 'c') {
	    process.exit();
	  }
	});
}

// Generic functions
function buf2hex(buffer) { // buffer is an ArrayBuffer
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2));
}

function radsToDeg(radians) {
  return radians * 180 / Math.PI
}

function degsToRad(degrees) {
  return degrees * (Math.PI/180.0);
}

function padd(n, p, c)
{
  var pad_char = typeof c !== 'undefined' ? c : '0';
  var pad = new Array(1 + p).join(pad_char);
  return (pad + n).slice(-pad.length);
}

// Sleep
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Heartbeat PGN 126993
const hexByte = require('./canboatjs/lib/utilities').hexByte
const heartbeat_msg = "%s,7,126993,%s,255,8,60,ea,%s,ff,ff,ff,ff,ff"
var heartbeatSequencenumber = 0

function heartbeat () {
  heartbeatSequencenumber++
  if (heartbeatSequencenumber > 600) {
    heartbeatSequencenumber = 1
  }
  msg = util.format(heartbeat_msg, (new Date()).toISOString(), canbus.candevice.address, hexByte(heartbeatSequencenumber))
  canbus.sendPGN(msg)
}

async function PGN130822 () {
  const messages = [
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0e,00,00,fc,13,25,00,00,74,be",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0f,00,00,fc,13,60,04,00,a3,5c",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,09,00,00,fc,12,1c,00,00,dd,d1",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0a,00,00,fc,13,b6,00,00,94,3a",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0b,00,00,fc,13,b9,00,00,16,67",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0c,00,00,fc,13,6f,00,00,03,bb",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0d,00,00,fc,13,25,00,00,74,be",
    "%s,3,130822,%s,255,0f,13,99,ff,01,00,0e,00,00,fc,13,25,00,00,74,be" ]

  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(1000)
  }
}

function AC12_PGN130860 () {
  const message = "%s,7,130860,%s,255,21,13,99,ff,ff,ff,ff,7f,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff,ff,7f,ff,ff,ff,7f"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

function AC12_PGN130850 () {
  const message = "%s,2,130850,%s,255,0c,41,9f,ff,ff,64,00,2b,00,ff,ff,ff,ff,ff"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

function AC12_PGN127250 () {
  // 2020-04-19-18:45:46.934,3,127250,7,255,8,0,3b,8f,ff,7f,0e,01,fd
  // 2020-04-19-18:46:19.480 2 115 255 127250 Vessel Heading:  SID = 0; Heading = 210.1 deg; Deviation = Unknown; Variation = Unknown; Reference = Magnetic
  const message = "%s,3,127250,%s,255,8,00,%s,ff,7f,ff,7f,fd" // fc = true, fd = magnetic
  // true_heading = Math.trunc(degsToRad(heading + mag_variation) * 10000)
  magnetic_heading = Math.trunc(degsToRad(heading) * 10000)
  // debug ("heading_true_rad: %s  variation: %s", true_heading, mag_variation);
  heading_hex = padd((magnetic_heading & 0xff).toString(16), 2) + "," + padd(((magnetic_heading >> 8) & 0xff).toString(16), 2)
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address, heading_hex)
  canbus.sendPGN(msg)
}

function AC12_PGN127245 () {
  const message = "%s,2,127245,%s,255,8,%s"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address, rudder_pgn_data)
  canbus.sendPGN(msg)
}

function AC12_PGN128275 (log_pgn_data) {
  const message = "%s,2,128275,%s,255,8,%s"
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address, log_pgn_data)
  canbus.sendPGN(msg)
}

function AC12_PGN127237 () {
  const heading_track_pgn = {
      "auto":    "%s,2,127237,%s,%s,15,ff,7f,ff,ff,7f,%s,00,%s,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,%s",
      //"auto":    "%s,2,127237,%s,%s,15,ff,7c,ff,ff,7f,%s,00,%s,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,%s",
      "headinghold":     "%s,2,127237,%s,%s,15,ff,7f,ff,ff,7f,%s,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,%s",
      "wind":    "%s,2,127237,%s,%s,15,ff,7f,ff,ff,7f,%s,00,%s,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,%s",
      // "wind":    "",
      "navigation":    "%s,2,127237,%s,%s,15,ff,7f,ff,ff,7f,%s,00,%s,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,%s",
      //"standby": "%s,2,127237,%s,%s,15,ff,78,ff,ff,7f,ff,ff,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff" // Magnetic
      "standby": "%s,2,127237,%s,%s,15,ff,7f,ff,ff,7f,ff,ff,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,ff,ff" // Magnetic
      // "standby": "%s,2,127237,%s,%s,15,ff,3f,ff,ff,7f,ff,ff,00,00,ff,ff,ff,ff,ff,7f,ff,ff,ff,ff,%s" // True
  }

  switch (pilot_state) {
    case 'auto':
    case 'navigation':
      // var new_value = Math.trunc(degsToRad(heading) * 10000)
      // var msg = util.format(heading_track_pgn[pilot_state], (new Date()).toISOString(), canbus.candevice.address,
      //                      255, padd((new_value & 0xff).toString(16), 2), padd(((new_value >> 8) & 0xff).toString(16), 2))
      var msg = util.format(heading_track_pgn[pilot_state], (new Date()).toISOString(), canbus.candevice.address,
                            255, locked_heading_rad, locked_heading_rad, locked_heading_rad)
      // debug('127237 (auto): %j', msg);
      canbus.sendPGN(msg);
      break;
    case 'standby':
      var msg = util.format(heading_track_pgn[pilot_state], (new Date()).toISOString(), canbus.candevice.address, 255, heading_rad)
      // debug('127237 (standby): %j', msg);
      canbus.sendPGN(msg);
  }
}

async function AP44_PGN65305 () {
  const messages = [
    "%s,7,65305,%s,255,8,41,9f,01,03,00,00,00,00",
    "%s,7,65305,%s,255,8,41,9f,01,0b,00,00,00,00" ]

  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(500)
  }
}

async function AP44_bootconfig () {
  const messages = [
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0f,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0f,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0e,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0e,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,10,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,10,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,02,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,06,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,06,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,01,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,1d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,01,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,02,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,08,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1b,0c,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0c,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,21,19,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1f,1b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1f,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,22,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,22,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1e,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,20,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,20,1b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,23,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,23,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0f,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0f,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,0e,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,0e,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,10,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,10,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,02,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1a,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,19,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,11,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,06,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,06,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,01,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,1d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,01,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,02,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,08,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1c,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1b,0c,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,0c,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,14,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,18,09,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,21,19,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1f,1b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1f,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,22,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,22,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,1e,1a,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,20,0b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,20,1b,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,23,0d,00,00,ff,ff,ff,ff",
    "%s,3,130840,%s,%s,14,41,9f,01,ff,ff,ff,23,0b,00,00,ff,ff,ff,ff" ]
  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}


async function AC12_bootconfig () {
  const messages = [
    "%s,2,130845,%s,%s,0e,41,9f,fe,ff,ff,ff,18,09,00,01,07,00,ff,ff,ff",
    "%s,2,130845,%s,%s,0e,41,9f,ff,ff,01,ff,07,45,00,01,36,08,2b,01,ff",
    "%s,2,130845,%s,%s,0e,41,9f,ff,00,01,ff,07,44,00,01,8b,b5,0a,00,ff",
    "%s,2,130845,%s,%s,0e,41,9f,ff,00,01,ff,07,43,00,01,71,44,54,00,ff"
/*
    "%s,3,130840,%s,%s,11,41,9f,ff,00,01,02,ff,09,3f,04,34,e8,00,a0,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,05,01,fe,ff,03,ac,fb,e3,10,00,82,78,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,02,01,7f,ff,03,d1,15,80,11,00,91,78,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,03,01,0b,ff,04,15,11,77,22,00,be,a0,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,08,01,23,ff,00,ac,fb,e3,10,00,82,78,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,09,01,01,ff,00,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,04,01,01,ff,03,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,01,01,fe,ff,03,6c,1f,b8,2f,00,aa,78,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,38,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,6a,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,36,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,68,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,36,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,36,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,68,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,68,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,38,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,38,64,01,ff,32,e1,b9,3a,e8,00,96,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,6a,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff",
    "%s,3,130840,%s,%s,11,41,9f,ff,6a,64,fe,ff,ff,6c,5f,b3,2f,00,8c,50,c0,ff"
  */
  ]
  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}

async function AC12_PGN65340 () {
  // Valid options:

  // Standby
  // 3,65340,2,255,8,41,9f,00,00,fe,f8,00,80
  // 7,65302,2,255,8,41,9f,0a,6b,00,00,00,ff

  // headinghold
  // 3,65340,2,255,8,41,9f,10,01,fe,fa,00,80
  // 7,65302,2,255,8,41,9f,0a,69,00,00,28,ff

  // 3,65340,2,255,8,41,9f,10,03,fe,fa,00,80
  // 7,65302,2,255,8,41,9f,0a,69,00,00,30,ff
  //
/*
3,65340,2,255,8,41,9f,00,00,fe,f8,00,80
3,65340,2,255,8,41,9f,00,00,fe,f9,00,80
3,65340,2,255,8,41,9f,10,01,fe,fa,00,80
3,65340,2,255,8,41,9f,10,03,fe,fa,00,80
*/

  const pgn65340 = {
      "standby":     "%s,3,65340,%s,255,8,41,9f,00,00,fe,f8,00,80",
      "headinghold": "%s,3,65340,%s,255,8,41,9f,10,01,fe,fa,00,80", // Heading Hold
      "followup":    "%s,3,65340,%s,255,8,41,9f,10,03,fe,fa,00,80", // Follow up
      "wind":        "%s,3,65340,%s,255,8,41,9f,10,03,fe,fa,00,80",
      "navigation":  "%s,3,65340,%s,255,8,41,9f,10,06,fe,f8,00,80"
  }
  const pgn65302 = {
      "standby":    "%s,7,65302,%s,255,8,41,9f,0a,6b,00,00,00,ff",
      "headinghold":"%s,7,65302,%s,255,8,41,9f,0a,69,00,00,28,ff", // Heading Hold
      "followup":   "%s,7,65302,%s,255,8,41,9f,0a,69,00,00,30,ff", // Follow up
      "wind":       "%s,7,65302,%s,255,8,41,9f,0a,69,00,00,30,ff",
      "navigation": "%s,7,65302,%s,255,8,41,9f,0a,6b,00,00,28,ff"  // guessing
  }
  const messages = [
    pgn65340[ac12mode],
    pgn65302[ac12mode] ]

  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}

function AC12_PGN65341_1s () {
  const message = "%s,6,65341,%s,255,8,41,9f,ff,ff,0d,ff,ff,7f";
  msg = util.format(message, (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

async function AC12_PGN65341_5s () {
  const messages = [
    "%s,6,65341,%s,255,8,41,9f,ff,ff,0b,ff,00,00",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,0c,ff,ff,ff",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,03,ff,ff,ff",
    "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,ff,ff" ]
  for (var nr in messages) {
    msg = util.format(messages[nr], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    await sleep(25)
  }
}

function AC12_PGN65341_02 () {
  const pgn65341_02 = {
      "auto":       "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,15,9a",
      "headinghold":"%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,00,00",
      "wind":       "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,00,00",
      "navigation": "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,12,00", // guess
      "followup":   "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,14,9a", // guess
      "standby":    "%s,6,65341,%s,255,8,41,9f,ff,ff,02,ff,ff,ff"
  }
  msg = util.format(pgn65341_02[ac12mode], (new Date()).toISOString(), canbus.candevice.address)
  canbus.sendPGN(msg)
}

async function AC12_PGN65305 () {
  /*
    Determines what's shown as mode on B&G plotter.
    41,9f,00,1d determines mode
    41,9f,00,0[0a] determines state (standby/engaged)
  */

  debug('AC12 mode: %s  state: %s', ac12mode, ac12state);

  if (ac12state == 'standby') {
    switch (ac12mode) {
      case 'headinghold':
        messages_mode = [
          "%s,7,65305,%s,255,8,41,9f,00,02,02,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,0a,0c,00,80,00" ]
        break;
      case 'navigation':
          messages = [
          "%s,7,65305,%s,255,8,41,9f,00,02,02,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,0a,0e,00,80,00" ]
        break;
      case 'followup': // unknown
        messages_mode = [
          "%s,7,65305,%s,255,8,41,9f,00,02,10,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,1d,81,00,00,00" ]
          // "%s,7,65305,%s,255,8,41,9f,00,0a,16,00,00,00" ]
        break;
      case 'wind': // unknown
        messages_mode = [
          "%s,7,65305,%s,255,8,41,9f,00,02,10,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,1d,81,00,00,00" ]
          // "%s,7,65305,%s,255,8,41,9f,00,0a,16,00,00,00" ]
        break;
    }
  } else if (ac12state == 'engaged') {
    switch (ac12mode) {
      case 'headinghold':
        messages_mode = [
          "%s,7,65305,%s,255,8,41,9f,00,1d,01,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,1d,81,00,00,00" ]
        break;
        case 'navigation':
            messages = [
            "%s,7,65305,%s,255,8,41,9f,00,02,02,00,00,00",
            "%s,7,65305,%s,255,8,41,9f,00,0a,0e,00,80,00" ]
          break;
      case 'followup': // unknown
        messages_mode = [
          "%s,7,65305,%s,255,8,41,9f,00,02,10,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,1d,81,00,00,00" ]
          // "%s,7,65305,%s,255,8,41,9f,00,0a,16,00,00,00" ]
        break;
      case 'wind': // unknown
        messages_mode = [
          "%s,7,65305,%s,255,8,41,9f,00,02,10,00,00,00",
          "%s,7,65305,%s,255,8,41,9f,00,1d,81,00,00,00" ]
          // "%s,7,65305,%s,255,8,41,9f,00,0a,16,00,00,00" ]
        break;
    }
  }
  for (var message in messages) {
    msg = util.format(messages[message], (new Date()).toISOString(), canbus.candevice.address)
    canbus.sendPGN(msg)
    debug('Sending PGN 65305: %s', msg);
    await sleep(25)
  }
}



switch (emulate) {
  case 'H5000':
    setInterval(heartbeat, 60000) // Heart beat PGN
    break;
}

function mainLoop () {
	while (canbus.readableLength > 0) {
	//debug('canbus.readableLength: %i', canbus.readableLength)
    msg = canbus.read()
		// debug('Received packet msg: %j', msg)
	  // debug('msg.pgn.src %i != canbus.candevice.address %i?', msg.pgn.src, canbus.candevice.address)
    if ( msg.pgn.dst == canbus.candevice.address || msg.pgn.dst == 255) {
      msg.pgn.fields = {};
      if (msg.pgn.pgn == 59904) {
        PGN = msg.data[2] * 256 * 256 + msg.data[1] * 256 + msg.data[0];
        debug('ISO request: %j', msg);
        debug('ISO request from %d to %d Data PGN: %i', msg.pgn.src, msg.pgn.dst, PGN);
        msg.pgn.fields.PGN = PGN;
        canbus.candevice.n2kMessage(msg.pgn);
      }
      switch (emulate) {
        case 'H5000':
          break;
        default:
      }
    }
	}
  setTimeout(mainLoop, 50)
}

// Wait for cansend
function waitForSend () {
  if (canbus.candevice.cansend) {
    mainLoop()
    return
  }
  setTimeout (waitForSend, 500)
}

waitForSend()
