"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/.pnpm/postgres-array@2.0.0/node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/.pnpm/postgres-array@2.0.0/node_modules/postgres-array/index.js"(exports2) {
    "use strict";
    exports2.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/arrayParser.js"(exports2, module2) {
    var array = require_postgres_array();
    module2.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/.pnpm/postgres-date@1.0.7/node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/.pnpm/postgres-date@1.0.7/node_modules/postgres-date/index.js"(exports2, module2) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module2.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// node_modules/.pnpm/xtend@4.0.2/node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/.pnpm/xtend@4.0.2/node_modules/xtend/mutable.js"(exports2, module2) {
    module2.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/.pnpm/postgres-interval@1.2.0/node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/.pnpm/postgres-interval@1.2.0/node_modules/postgres-interval/index.js"(exports2, module2) {
    "use strict";
    var extend = require_mutable();
    module2.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/.pnpm/postgres-bytea@1.0.1/node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/.pnpm/postgres-bytea@1.0.1/node_modules/postgres-bytea/index.js"(exports2, module2) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module2.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/textParsers.js"(exports2, module2) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/.pnpm/pg-int8@1.0.1/node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/.pnpm/pg-int8@1.0.1/node_modules/pg-int8/index.js"(exports2, module2) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module2.exports = readInt8;
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/binaryParsers.js"(exports2, module2) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/builtins.js"(exports2, module2) {
    module2.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/index.js"(exports2) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports2.getTypeParser = getTypeParser;
    exports2.setTypeParser = setTypeParser;
    exports2.arrayParser = arrayParser;
    exports2.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/defaults.js"(exports2, module2) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module2.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module2.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/utils.js"(exports2, module2) {
    "use strict";
    var defaults = require_defaults();
    var { isDate } = require("util/types");
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (defaults.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : config;
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    var escapeIdentifier = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module2.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier,
      escapeLiteral
    };
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/crypto/utils.js"(exports2, module2) {
    var nodeCrypto = require("crypto");
    module2.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/crypto/cert-signatures.js"(exports2, module2) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https: return//github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module2.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/crypto/sasl.js"(exports2, module2) {
    "use strict";
    var crypto2 = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto2.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto2.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto2.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto2.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto2.sha256(clientKey);
      const clientSignature = await crypto2.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto2.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto2.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module2.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/type-overrides.js"(exports2, module2) {
    "use strict";
    var types = require_pg_types();
    function TypeOverrides(userTypes) {
      this._types = userTypes || types;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module2.exports = TypeOverrides;
  }
});

// node_modules/.pnpm/pg-connection-string@2.14.0/node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/.pnpm/pg-connection-string@2.14.0/node_modules/pg-connection-string/index.js"(exports2, module2) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = dummyHost ? "" : result.hostname;
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs = config.sslcert || config.sslkey || config.sslrootcert ? require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module2.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/connection-parameters.js"(exports2, module2) {
    "use strict";
    var dns = require("dns");
    var defaults = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module2.exports = ConnectionParameters;
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/result.js"(exports2, module2) {
    "use strict";
    var types = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result = class {
      constructor(rowMode, types2) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types2;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module2.exports = Result;
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/query.js"(exports2, module2) {
    "use strict";
    var { EventEmitter } = require("events");
    var Result = require_result();
    var utils = require_utils();
    var Query = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && connection.parsedStatements[this.name];
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module2.exports = Query;
  }
});

// node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoticeMessage = exports2.DataRowMessage = exports2.CommandCompleteMessage = exports2.ReadyForQueryMessage = exports2.NotificationResponseMessage = exports2.BackendKeyDataMessage = exports2.AuthenticationMD5Password = exports2.ParameterStatusMessage = exports2.ParameterDescriptionMessage = exports2.RowDescriptionMessage = exports2.Field = exports2.CopyResponse = exports2.CopyDataMessage = exports2.DatabaseError = exports2.copyDone = exports2.emptyQuery = exports2.replicationStart = exports2.portalSuspended = exports2.noData = exports2.closeComplete = exports2.bindComplete = exports2.parseComplete = void 0;
    exports2.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports2.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports2.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports2.noData = {
      name: "noData",
      length: 5
    };
    exports2.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports2.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports2.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports2.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports2.DatabaseError = DatabaseError;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports2.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports2.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports2.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports2.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports2.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports2.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports2.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports2.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports2.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports2.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports2.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports2.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports2.NoticeMessage = NoticeMessage;
  }
});

// node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/buffer-writer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports2.Writer = Writer;
  }
});

// node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/serializer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types = query2.types || emptyArray;
      const len = types.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var paramWriter = new buffer_writer_1.Writer();
    var writeValues = function(values, valueMapper) {
      for (let i = 0; i < values.length; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        if (mappedVal == null) {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          writer.addInt16(
            1
            /* ParamType.BINARY */
          );
          paramWriter.addInt32(mappedVal.length);
          paramWriter.add(mappedVal);
        } else {
          writer.addInt16(
            0
            /* ParamType.STRING */
          );
          paramWriter.addInt32PrefixedString(mappedVal);
        }
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper);
      } catch (err) {
        writer.clear();
        paramWriter.clear();
        throw err;
      }
      writer.addInt16(len);
      writer.add(paramWriter.flush());
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports2.serialize = serialize;
  }
});

// node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/buffer-reader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports2.BufferReader = BufferReader;
  }
});

// node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports2.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.int32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.15.0/node_modules/pg-protocol/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseError = exports2.serialize = void 0;
    exports2.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports2, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// node_modules/.pnpm/pg-cloudflare@1.4.0/node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "node_modules/.pnpm/pg-cloudflare@1.4.0/node_modules/pg-cloudflare/dist/empty.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = {};
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/stream.js"(exports2, module2) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module2.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/connection.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._ending = true;
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module2.exports = Connection;
  }
});

// node_modules/.pnpm/split2@4.2.0/node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/.pnpm/split2@4.2.0/node_modules/split2/index.js"(exports2, module2) {
    "use strict";
    var { Transform } = require("stream");
    var { StringDecoder } = require("string_decoder");
    var kLast = /* @__PURE__ */ Symbol("last");
    var kDecoder = /* @__PURE__ */ Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module2.exports = split;
  }
});

// node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/helper.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var Stream = require("stream").Stream;
    var split = require_split2();
    var util = require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module2.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module2.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module2.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module2.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module2.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module2.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module2.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module2.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/index.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs = require("fs");
    var helper = require_helper();
    module2.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module2.exports.warnTo = helper.warnTo;
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/client.js"(exports2, module2) {
    var EventEmitter = require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = require("util");
    var sasl = require_sasl();
    var TypeOverrides = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query = require_query();
    var defaults = require_defaults();
    var Connection = require_connection();
    var crypto2 = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this.binary = c.binary || defaults.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto2.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (this._getActiveQuery() || !this._queryable) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client.Query = Query;
    module2.exports = Client;
  }
});

// node_modules/.pnpm/pg-pool@3.14.0_pg@8.22.0/node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/.pnpm/pg-pool@3.14.0_pg@8.22.0/node_modules/pg-pool/index.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool = class extends EventEmitter {
      constructor(options, Client) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module2.exports = Pool;
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/native/query.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var utils = require_utils();
    var NativeQuery = module2.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name]) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/native/client.js"(exports2, module2) {
    var nodeUtils = require("util");
    var Native;
    try {
      Native = require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides = require_type_overrides();
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client = module2.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client.Query = NativeQuery;
    util.inherits(Client, EventEmitter);
    Client.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      this.native.end(function() {
        self._connected = false;
        self._errorAllQueries(new Error("Connection terminated"));
        process.nextTick(() => {
          self.emit("end");
          if (cb) cb();
        });
      });
      return result;
    };
    Client.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client.prototype.ref = function() {
    };
    Client.prototype.unref = function() {
    };
    Client.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client.prototype.isConnected = function() {
      return this._connected;
    };
    Client.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/native/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_client2();
  }
});

// node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/.pnpm/pg@8.22.0/node_modules/pg/lib/index.js"(exports2, module2) {
    "use strict";
    var Client = require_client();
    var defaults = require_defaults();
    var Connection = require_connection();
    var Result = require_result();
    var utils = require_utils();
    var Pool = require_pg_pool();
    var TypeOverrides = require_type_overrides();
    var { DatabaseError } = require_dist();
    var { escapeIdentifier, escapeLiteral } = require_utils();
    var poolFactory = (Client2) => {
      return class BoundPool extends Pool {
        constructor(options) {
          super(options, Client2);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError;
      this.TypeOverrides = TypeOverrides;
      this.escapeIdentifier = escapeIdentifier;
      this.escapeLiteral = escapeLiteral;
      this.Result = Result;
      this.utils = utils;
    };
    var clientConstructor = Client;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module2.exports = new PG(clientConstructor);
    Object.defineProperty(module2.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module2.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/entity.cjs
var require_entity = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/entity.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var entity_exports = {};
    __export(entity_exports, {
      entityKind: () => entityKind,
      hasOwnEntityKind: () => hasOwnEntityKind,
      is: () => is
    });
    module2.exports = __toCommonJS(entity_exports);
    var entityKind = /* @__PURE__ */ Symbol.for("drizzle:entityKind");
    var hasOwnEntityKind = /* @__PURE__ */ Symbol.for("drizzle:hasOwnEntityKind");
    function is(value, type) {
      if (!value || typeof value !== "object") {
        return false;
      }
      if (value instanceof type) {
        return true;
      }
      if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
        throw new Error(
          `Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`
        );
      }
      let cls = Object.getPrototypeOf(value).constructor;
      if (cls) {
        while (cls) {
          if (entityKind in cls && cls[entityKind] === type[entityKind]) {
            return true;
          }
          cls = Object.getPrototypeOf(cls);
        }
      }
      return false;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/logger.cjs
var require_logger = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/logger.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var logger_exports = {};
    __export(logger_exports, {
      ConsoleLogWriter: () => ConsoleLogWriter,
      DefaultLogger: () => DefaultLogger,
      NoopLogger: () => NoopLogger
    });
    module2.exports = __toCommonJS(logger_exports);
    var import_entity = require_entity();
    var ConsoleLogWriter = class {
      static [import_entity.entityKind] = "ConsoleLogWriter";
      write(message) {
        console.log(message);
      }
    };
    var DefaultLogger = class {
      static [import_entity.entityKind] = "DefaultLogger";
      writer;
      constructor(config) {
        this.writer = config?.writer ?? new ConsoleLogWriter();
      }
      logQuery(query, params) {
        const stringifiedParams = params.map((p) => {
          try {
            return JSON.stringify(p);
          } catch {
            return String(p);
          }
        });
        const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
        this.writer.write(`Query: ${query}${paramsStr}`);
      }
    };
    var NoopLogger = class {
      static [import_entity.entityKind] = "NoopLogger";
      logQuery() {
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/query-promise.cjs
var require_query_promise = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/query-promise.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_promise_exports = {};
    __export(query_promise_exports, {
      QueryPromise: () => QueryPromise
    });
    module2.exports = __toCommonJS(query_promise_exports);
    var import_entity = require_entity();
    var QueryPromise = class {
      static [import_entity.entityKind] = "QueryPromise";
      [Symbol.toStringTag] = "QueryPromise";
      catch(onRejected) {
        return this.then(void 0, onRejected);
      }
      finally(onFinally) {
        return this.then(
          (value) => {
            onFinally?.();
            return value;
          },
          (reason) => {
            onFinally?.();
            throw reason;
          }
        );
      }
      then(onFulfilled, onRejected) {
        return this.execute().then(onFulfilled, onRejected);
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/column.cjs
var require_column = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/column.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var column_exports = {};
    __export(column_exports, {
      Column: () => Column
    });
    module2.exports = __toCommonJS(column_exports);
    var import_entity = require_entity();
    var Column = class {
      constructor(table, config) {
        this.table = table;
        this.config = config;
        this.name = config.name;
        this.keyAsName = config.keyAsName;
        this.notNull = config.notNull;
        this.default = config.default;
        this.defaultFn = config.defaultFn;
        this.onUpdateFn = config.onUpdateFn;
        this.hasDefault = config.hasDefault;
        this.primary = config.primaryKey;
        this.isUnique = config.isUnique;
        this.uniqueName = config.uniqueName;
        this.uniqueType = config.uniqueType;
        this.dataType = config.dataType;
        this.columnType = config.columnType;
        this.generated = config.generated;
        this.generatedIdentity = config.generatedIdentity;
      }
      static [import_entity.entityKind] = "Column";
      name;
      keyAsName;
      primary;
      notNull;
      default;
      defaultFn;
      onUpdateFn;
      hasDefault;
      isUnique;
      uniqueName;
      uniqueType;
      dataType;
      columnType;
      enumValues = void 0;
      generated = void 0;
      generatedIdentity = void 0;
      config;
      mapFromDriverValue(value) {
        return value;
      }
      mapToDriverValue(value) {
        return value;
      }
      // ** @internal */
      shouldDisableInsert() {
        return this.config.generated !== void 0 && this.config.generated.type !== "byDefault";
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/column-builder.cjs
var require_column_builder = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/column-builder.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var column_builder_exports = {};
    __export(column_builder_exports, {
      ColumnBuilder: () => ColumnBuilder
    });
    module2.exports = __toCommonJS(column_builder_exports);
    var import_entity = require_entity();
    var ColumnBuilder = class {
      static [import_entity.entityKind] = "ColumnBuilder";
      config;
      constructor(name, dataType, columnType) {
        this.config = {
          name,
          keyAsName: name === "",
          notNull: false,
          default: void 0,
          hasDefault: false,
          primaryKey: false,
          isUnique: false,
          uniqueName: void 0,
          uniqueType: void 0,
          dataType,
          columnType,
          generated: void 0
        };
      }
      /**
       * Changes the data type of the column. Commonly used with `json` columns. Also, useful for branded types.
       *
       * @example
       * ```ts
       * const users = pgTable('users', {
       * 	id: integer('id').$type<UserId>().primaryKey(),
       * 	details: json('details').$type<UserDetails>().notNull(),
       * });
       * ```
       */
      $type() {
        return this;
      }
      /**
       * Adds a `not null` clause to the column definition.
       *
       * Affects the `select` model of the table - columns *without* `not null` will be nullable on select.
       */
      notNull() {
        this.config.notNull = true;
        return this;
      }
      /**
       * Adds a `default <value>` clause to the column definition.
       *
       * Affects the `insert` model of the table - columns *with* `default` are optional on insert.
       *
       * If you need to set a dynamic default value, use {@link $defaultFn} instead.
       */
      default(value) {
        this.config.default = value;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Adds a dynamic default value to the column.
       * The function will be called when the row is inserted, and the returned value will be used as the column value.
       *
       * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
       */
      $defaultFn(fn) {
        this.config.defaultFn = fn;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Alias for {@link $defaultFn}.
       */
      $default = this.$defaultFn;
      /**
       * Adds a dynamic update value to the column.
       * The function will be called when the row is updated, and the returned value will be used as the column value if none is provided.
       * If no `default` (or `$defaultFn`) value is provided, the function will be called when the row is inserted as well, and the returned value will be used as the column value.
       *
       * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
       */
      $onUpdateFn(fn) {
        this.config.onUpdateFn = fn;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Alias for {@link $onUpdateFn}.
       */
      $onUpdate = this.$onUpdateFn;
      /**
       * Adds a `primary key` clause to the column definition. This implicitly makes the column `not null`.
       *
       * In SQLite, `integer primary key` implicitly makes the column auto-incrementing.
       */
      primaryKey() {
        this.config.primaryKey = true;
        this.config.notNull = true;
        return this;
      }
      /** @internal Sets the name of the column to the key within the table definition if a name was not given. */
      setName(name) {
        if (this.config.name !== "") return;
        this.config.name = name;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/table.utils.cjs
var require_table_utils = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/table.utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var table_utils_exports = {};
    __export(table_utils_exports, {
      TableName: () => TableName
    });
    module2.exports = __toCommonJS(table_utils_exports);
    var TableName = /* @__PURE__ */ Symbol.for("drizzle:Name");
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/foreign-keys.cjs
var require_foreign_keys = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/foreign-keys.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var foreign_keys_exports = {};
    __export(foreign_keys_exports, {
      ForeignKey: () => ForeignKey,
      ForeignKeyBuilder: () => ForeignKeyBuilder,
      foreignKey: () => foreignKey
    });
    module2.exports = __toCommonJS(foreign_keys_exports);
    var import_entity = require_entity();
    var import_table_utils = require_table_utils();
    var ForeignKeyBuilder = class {
      static [import_entity.entityKind] = "PgForeignKeyBuilder";
      /** @internal */
      reference;
      /** @internal */
      _onUpdate = "no action";
      /** @internal */
      _onDelete = "no action";
      constructor(config, actions) {
        this.reference = () => {
          const { name, columns, foreignColumns } = config();
          return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
        };
        if (actions) {
          this._onUpdate = actions.onUpdate;
          this._onDelete = actions.onDelete;
        }
      }
      onUpdate(action) {
        this._onUpdate = action === void 0 ? "no action" : action;
        return this;
      }
      onDelete(action) {
        this._onDelete = action === void 0 ? "no action" : action;
        return this;
      }
      /** @internal */
      build(table) {
        return new ForeignKey(table, this);
      }
    };
    var ForeignKey = class {
      constructor(table, builder) {
        this.table = table;
        this.reference = builder.reference;
        this.onUpdate = builder._onUpdate;
        this.onDelete = builder._onDelete;
      }
      static [import_entity.entityKind] = "PgForeignKey";
      reference;
      onUpdate;
      onDelete;
      getName() {
        const { name, columns, foreignColumns } = this.reference();
        const columnNames = columns.map((column) => column.name);
        const foreignColumnNames = foreignColumns.map((column) => column.name);
        const chunks = [
          this.table[import_table_utils.TableName],
          ...columnNames,
          foreignColumns[0].table[import_table_utils.TableName],
          ...foreignColumnNames
        ];
        return name ?? `${chunks.join("_")}_fk`;
      }
    };
    function foreignKey(config) {
      function mappedConfig() {
        const { name, columns, foreignColumns } = config;
        return {
          name,
          columns,
          foreignColumns
        };
      }
      return new ForeignKeyBuilder(mappedConfig);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/tracing-utils.cjs
var require_tracing_utils = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/tracing-utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var tracing_utils_exports = {};
    __export(tracing_utils_exports, {
      iife: () => iife
    });
    module2.exports = __toCommonJS(tracing_utils_exports);
    function iife(fn, ...args) {
      return fn(...args);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/unique-constraint.cjs
var require_unique_constraint = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/unique-constraint.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var unique_constraint_exports = {};
    __export(unique_constraint_exports, {
      UniqueConstraint: () => UniqueConstraint,
      UniqueConstraintBuilder: () => UniqueConstraintBuilder,
      UniqueOnConstraintBuilder: () => UniqueOnConstraintBuilder,
      unique: () => unique,
      uniqueKeyName: () => uniqueKeyName
    });
    module2.exports = __toCommonJS(unique_constraint_exports);
    var import_entity = require_entity();
    var import_table_utils = require_table_utils();
    function unique(name) {
      return new UniqueOnConstraintBuilder(name);
    }
    function uniqueKeyName(table, columns) {
      return `${table[import_table_utils.TableName]}_${columns.join("_")}_unique`;
    }
    var UniqueConstraintBuilder = class {
      constructor(columns, name) {
        this.name = name;
        this.columns = columns;
      }
      static [import_entity.entityKind] = "PgUniqueConstraintBuilder";
      /** @internal */
      columns;
      /** @internal */
      nullsNotDistinctConfig = false;
      nullsNotDistinct() {
        this.nullsNotDistinctConfig = true;
        return this;
      }
      /** @internal */
      build(table) {
        return new UniqueConstraint(table, this.columns, this.nullsNotDistinctConfig, this.name);
      }
    };
    var UniqueOnConstraintBuilder = class {
      static [import_entity.entityKind] = "PgUniqueOnConstraintBuilder";
      /** @internal */
      name;
      constructor(name) {
        this.name = name;
      }
      on(...columns) {
        return new UniqueConstraintBuilder(columns, this.name);
      }
    };
    var UniqueConstraint = class {
      constructor(table, columns, nullsNotDistinct, name) {
        this.table = table;
        this.columns = columns;
        this.name = name ?? uniqueKeyName(this.table, this.columns.map((column) => column.name));
        this.nullsNotDistinct = nullsNotDistinct;
      }
      static [import_entity.entityKind] = "PgUniqueConstraint";
      columns;
      name;
      nullsNotDistinct = false;
      getName() {
        return this.name;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/utils/array.cjs
var require_array = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/utils/array.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var array_exports = {};
    __export(array_exports, {
      makePgArray: () => makePgArray,
      parsePgArray: () => parsePgArray,
      parsePgNestedArray: () => parsePgNestedArray
    });
    module2.exports = __toCommonJS(array_exports);
    function parsePgArrayValue(arrayString, startFrom, inQuotes) {
      for (let i = startFrom; i < arrayString.length; i++) {
        const char = arrayString[i];
        if (char === "\\") {
          i++;
          continue;
        }
        if (char === '"') {
          return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i + 1];
        }
        if (inQuotes) {
          continue;
        }
        if (char === "," || char === "}") {
          return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i];
        }
      }
      return [arrayString.slice(startFrom).replace(/\\/g, ""), arrayString.length];
    }
    function parsePgNestedArray(arrayString, startFrom = 0) {
      const result = [];
      let i = startFrom;
      let lastCharIsComma = false;
      while (i < arrayString.length) {
        const char = arrayString[i];
        if (char === ",") {
          if (lastCharIsComma || i === startFrom) {
            result.push("");
          }
          lastCharIsComma = true;
          i++;
          continue;
        }
        lastCharIsComma = false;
        if (char === "\\") {
          i += 2;
          continue;
        }
        if (char === '"') {
          const [value2, startFrom2] = parsePgArrayValue(arrayString, i + 1, true);
          result.push(value2);
          i = startFrom2;
          continue;
        }
        if (char === "}") {
          return [result, i + 1];
        }
        if (char === "{") {
          const [value2, startFrom2] = parsePgNestedArray(arrayString, i + 1);
          result.push(value2);
          i = startFrom2;
          continue;
        }
        const [value, newStartFrom] = parsePgArrayValue(arrayString, i, false);
        result.push(value);
        i = newStartFrom;
      }
      return [result, i];
    }
    function parsePgArray(arrayString) {
      const [result] = parsePgNestedArray(arrayString, 1);
      return result;
    }
    function makePgArray(array) {
      return `{${array.map((item) => {
        if (Array.isArray(item)) {
          return makePgArray(item);
        }
        if (typeof item === "string") {
          return `"${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
        }
        return `${item}`;
      }).join(",")}}`;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/common.cjs
var require_common = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var common_exports = {};
    __export(common_exports, {
      ExtraConfigColumn: () => ExtraConfigColumn,
      IndexedColumn: () => IndexedColumn,
      PgArray: () => PgArray,
      PgArrayBuilder: () => PgArrayBuilder,
      PgColumn: () => PgColumn,
      PgColumnBuilder: () => PgColumnBuilder
    });
    module2.exports = __toCommonJS(common_exports);
    var import_column_builder = require_column_builder();
    var import_column = require_column();
    var import_entity = require_entity();
    var import_foreign_keys = require_foreign_keys();
    var import_tracing_utils = require_tracing_utils();
    var import_unique_constraint = require_unique_constraint();
    var import_array = require_array();
    var PgColumnBuilder = class extends import_column_builder.ColumnBuilder {
      foreignKeyConfigs = [];
      static [import_entity.entityKind] = "PgColumnBuilder";
      array(size) {
        return new PgArrayBuilder(this.config.name, this, size);
      }
      references(ref, actions = {}) {
        this.foreignKeyConfigs.push({ ref, actions });
        return this;
      }
      unique(name, config) {
        this.config.isUnique = true;
        this.config.uniqueName = name;
        this.config.uniqueType = config?.nulls;
        return this;
      }
      generatedAlwaysAs(as) {
        this.config.generated = {
          as,
          type: "always",
          mode: "stored"
        };
        return this;
      }
      /** @internal */
      buildForeignKeys(column, table) {
        return this.foreignKeyConfigs.map(({ ref, actions }) => {
          return (0, import_tracing_utils.iife)(
            (ref2, actions2) => {
              const builder = new import_foreign_keys.ForeignKeyBuilder(() => {
                const foreignColumn = ref2();
                return { columns: [column], foreignColumns: [foreignColumn] };
              });
              if (actions2.onUpdate) {
                builder.onUpdate(actions2.onUpdate);
              }
              if (actions2.onDelete) {
                builder.onDelete(actions2.onDelete);
              }
              return builder.build(table);
            },
            ref,
            actions
          );
        });
      }
      /** @internal */
      buildExtraConfigColumn(table) {
        return new ExtraConfigColumn(table, this.config);
      }
    };
    var PgColumn = class extends import_column.Column {
      constructor(table, config) {
        if (!config.uniqueName) {
          config.uniqueName = (0, import_unique_constraint.uniqueKeyName)(table, [config.name]);
        }
        super(table, config);
        this.table = table;
      }
      static [import_entity.entityKind] = "PgColumn";
    };
    var ExtraConfigColumn = class extends PgColumn {
      static [import_entity.entityKind] = "ExtraConfigColumn";
      getSQLType() {
        return this.getSQLType();
      }
      indexConfig = {
        order: this.config.order ?? "asc",
        nulls: this.config.nulls ?? "last",
        opClass: this.config.opClass
      };
      defaultConfig = {
        order: "asc",
        nulls: "last",
        opClass: void 0
      };
      asc() {
        this.indexConfig.order = "asc";
        return this;
      }
      desc() {
        this.indexConfig.order = "desc";
        return this;
      }
      nullsFirst() {
        this.indexConfig.nulls = "first";
        return this;
      }
      nullsLast() {
        this.indexConfig.nulls = "last";
        return this;
      }
      /**
       * ### PostgreSQL documentation quote
       *
       * > An operator class with optional parameters can be specified for each column of an index.
       * The operator class identifies the operators to be used by the index for that column.
       * For example, a B-tree index on four-byte integers would use the int4_ops class;
       * this operator class includes comparison functions for four-byte integers.
       * In practice the default operator class for the column's data type is usually sufficient.
       * The main point of having operator classes is that for some data types, there could be more than one meaningful ordering.
       * For example, we might want to sort a complex-number data type either by absolute value or by real part.
       * We could do this by defining two operator classes for the data type and then selecting the proper class when creating an index.
       * More information about operator classes check:
       *
       * ### Useful links
       * https://www.postgresql.org/docs/current/sql-createindex.html
       *
       * https://www.postgresql.org/docs/current/indexes-opclass.html
       *
       * https://www.postgresql.org/docs/current/xindex.html
       *
       * ### Additional types
       * If you have the `pg_vector` extension installed in your database, you can use the
       * `vector_l2_ops`, `vector_ip_ops`, `vector_cosine_ops`, `vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`, `halfvec_l2_ops`, `sparsevec_l2_ops` options, which are predefined types.
       *
       * **You can always specify any string you want in the operator class, in case Drizzle doesn't have it natively in its types**
       *
       * @param opClass
       * @returns
       */
      op(opClass) {
        this.indexConfig.opClass = opClass;
        return this;
      }
    };
    var IndexedColumn = class {
      static [import_entity.entityKind] = "IndexedColumn";
      constructor(name, keyAsName, type, indexConfig) {
        this.name = name;
        this.keyAsName = keyAsName;
        this.type = type;
        this.indexConfig = indexConfig;
      }
      name;
      keyAsName;
      type;
      indexConfig;
    };
    var PgArrayBuilder = class extends PgColumnBuilder {
      static [import_entity.entityKind] = "PgArrayBuilder";
      constructor(name, baseBuilder, size) {
        super(name, "array", "PgArray");
        this.config.baseBuilder = baseBuilder;
        this.config.size = size;
      }
      /** @internal */
      build(table) {
        const baseColumn = this.config.baseBuilder.build(table);
        return new PgArray(
          table,
          this.config,
          baseColumn
        );
      }
    };
    var PgArray = class _PgArray extends PgColumn {
      constructor(table, config, baseColumn, range) {
        super(table, config);
        this.baseColumn = baseColumn;
        this.range = range;
        this.size = config.size;
      }
      size;
      static [import_entity.entityKind] = "PgArray";
      getSQLType() {
        return `${this.baseColumn.getSQLType()}[${typeof this.size === "number" ? this.size : ""}]`;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          value = (0, import_array.parsePgArray)(value);
        }
        return value.map((v) => this.baseColumn.mapFromDriverValue(v));
      }
      mapToDriverValue(value, isNestedArray = false) {
        const a = value.map(
          (v) => v === null ? null : (0, import_entity.is)(this.baseColumn, _PgArray) ? this.baseColumn.mapToDriverValue(v, true) : this.baseColumn.mapToDriverValue(v)
        );
        if (isNestedArray) return a;
        return (0, import_array.makePgArray)(a);
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/enum.cjs
var require_enum = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/enum.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var enum_exports = {};
    __export(enum_exports, {
      PgEnumColumn: () => PgEnumColumn,
      PgEnumColumnBuilder: () => PgEnumColumnBuilder,
      PgEnumObjectColumn: () => PgEnumObjectColumn,
      PgEnumObjectColumnBuilder: () => PgEnumObjectColumnBuilder,
      isPgEnum: () => isPgEnum,
      pgEnum: () => pgEnum,
      pgEnumObjectWithSchema: () => pgEnumObjectWithSchema,
      pgEnumWithSchema: () => pgEnumWithSchema
    });
    module2.exports = __toCommonJS(enum_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgEnumObjectColumnBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgEnumObjectColumnBuilder";
      constructor(name, enumInstance) {
        super(name, "string", "PgEnumObjectColumn");
        this.config.enum = enumInstance;
      }
      /** @internal */
      build(table) {
        return new PgEnumObjectColumn(
          table,
          this.config
        );
      }
    };
    var PgEnumObjectColumn = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgEnumObjectColumn";
      enum;
      enumValues = this.config.enum.enumValues;
      constructor(table, config) {
        super(table, config);
        this.enum = config.enum;
      }
      getSQLType() {
        return this.enum.enumName;
      }
    };
    var isPgEnumSym = /* @__PURE__ */ Symbol.for("drizzle:isPgEnum");
    function isPgEnum(obj) {
      return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
    }
    var PgEnumColumnBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgEnumColumnBuilder";
      constructor(name, enumInstance) {
        super(name, "string", "PgEnumColumn");
        this.config.enum = enumInstance;
      }
      /** @internal */
      build(table) {
        return new PgEnumColumn(
          table,
          this.config
        );
      }
    };
    var PgEnumColumn = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgEnumColumn";
      enum = this.config.enum;
      enumValues = this.config.enum.enumValues;
      constructor(table, config) {
        super(table, config);
        this.enum = config.enum;
      }
      getSQLType() {
        return this.enum.enumName;
      }
    };
    function pgEnum(enumName, input) {
      return Array.isArray(input) ? pgEnumWithSchema(enumName, [...input], void 0) : pgEnumObjectWithSchema(enumName, input, void 0);
    }
    function pgEnumWithSchema(enumName, values, schema) {
      const enumInstance = Object.assign(
        (name) => new PgEnumColumnBuilder(name ?? "", enumInstance),
        {
          enumName,
          enumValues: values,
          schema,
          [isPgEnumSym]: true
        }
      );
      return enumInstance;
    }
    function pgEnumObjectWithSchema(enumName, values, schema) {
      const enumInstance = Object.assign(
        (name) => new PgEnumObjectColumnBuilder(name ?? "", enumInstance),
        {
          enumName,
          enumValues: Object.values(values),
          schema,
          [isPgEnumSym]: true
        }
      );
      return enumInstance;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/subquery.cjs
var require_subquery = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/subquery.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var subquery_exports = {};
    __export(subquery_exports, {
      Subquery: () => Subquery,
      WithSubquery: () => WithSubquery
    });
    module2.exports = __toCommonJS(subquery_exports);
    var import_entity = require_entity();
    var Subquery = class {
      static [import_entity.entityKind] = "Subquery";
      constructor(sql, fields, alias, isWith = false, usedTables = []) {
        this._ = {
          brand: "Subquery",
          sql,
          selectedFields: fields,
          alias,
          isWith,
          usedTables
        };
      }
      // getSQL(): SQL<unknown> {
      // 	return new SQL([this]);
      // }
    };
    var WithSubquery = class extends Subquery {
      static [import_entity.entityKind] = "WithSubquery";
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/version.cjs
var require_version = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/version.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var version_exports = {};
    __export(version_exports, {
      compatibilityVersion: () => compatibilityVersion,
      npmVersion: () => version
    });
    module2.exports = __toCommonJS(version_exports);
    var version = "0.45.2";
    var compatibilityVersion = 10;
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/tracing.cjs
var require_tracing = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/tracing.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var tracing_exports = {};
    __export(tracing_exports, {
      tracer: () => tracer
    });
    module2.exports = __toCommonJS(tracing_exports);
    var import_tracing_utils = require_tracing_utils();
    var import_version = require_version();
    var otel;
    var rawTracer;
    var tracer = {
      startActiveSpan(name, fn) {
        if (!otel) {
          return fn();
        }
        if (!rawTracer) {
          rawTracer = otel.trace.getTracer("drizzle-orm", import_version.npmVersion);
        }
        return (0, import_tracing_utils.iife)(
          (otel2, rawTracer2) => rawTracer2.startActiveSpan(
            name,
            (span) => {
              try {
                return fn(span);
              } catch (e) {
                span.setStatus({
                  code: otel2.SpanStatusCode.ERROR,
                  message: e instanceof Error ? e.message : "Unknown error"
                  // eslint-disable-line no-instanceof/no-instanceof
                });
                throw e;
              } finally {
                span.end();
              }
            }
          ),
          otel,
          rawTracer
        );
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/view-common.cjs
var require_view_common = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/view-common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var view_common_exports = {};
    __export(view_common_exports, {
      ViewBaseConfig: () => ViewBaseConfig
    });
    module2.exports = __toCommonJS(view_common_exports);
    var ViewBaseConfig = /* @__PURE__ */ Symbol.for("drizzle:ViewBaseConfig");
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/table.cjs
var require_table = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/table.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var table_exports = {};
    __export(table_exports, {
      BaseName: () => BaseName,
      Columns: () => Columns,
      ExtraConfigBuilder: () => ExtraConfigBuilder,
      ExtraConfigColumns: () => ExtraConfigColumns,
      IsAlias: () => IsAlias,
      OriginalName: () => OriginalName,
      Schema: () => Schema,
      Table: () => Table,
      getTableName: () => getTableName,
      getTableUniqueName: () => getTableUniqueName,
      isTable: () => isTable
    });
    module2.exports = __toCommonJS(table_exports);
    var import_entity = require_entity();
    var import_table_utils = require_table_utils();
    var Schema = /* @__PURE__ */ Symbol.for("drizzle:Schema");
    var Columns = /* @__PURE__ */ Symbol.for("drizzle:Columns");
    var ExtraConfigColumns = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigColumns");
    var OriginalName = /* @__PURE__ */ Symbol.for("drizzle:OriginalName");
    var BaseName = /* @__PURE__ */ Symbol.for("drizzle:BaseName");
    var IsAlias = /* @__PURE__ */ Symbol.for("drizzle:IsAlias");
    var ExtraConfigBuilder = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigBuilder");
    var IsDrizzleTable = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleTable");
    var Table = class {
      static [import_entity.entityKind] = "Table";
      /** @internal */
      static Symbol = {
        Name: import_table_utils.TableName,
        Schema,
        OriginalName,
        Columns,
        ExtraConfigColumns,
        BaseName,
        IsAlias,
        ExtraConfigBuilder
      };
      /**
       * @internal
       * Can be changed if the table is aliased.
       */
      [import_table_utils.TableName];
      /**
       * @internal
       * Used to store the original name of the table, before any aliasing.
       */
      [OriginalName];
      /** @internal */
      [Schema];
      /** @internal */
      [Columns];
      /** @internal */
      [ExtraConfigColumns];
      /**
       *  @internal
       * Used to store the table name before the transformation via the `tableCreator` functions.
       */
      [BaseName];
      /** @internal */
      [IsAlias] = false;
      /** @internal */
      [IsDrizzleTable] = true;
      /** @internal */
      [ExtraConfigBuilder] = void 0;
      constructor(name, schema, baseName) {
        this[import_table_utils.TableName] = this[OriginalName] = name;
        this[Schema] = schema;
        this[BaseName] = baseName;
      }
    };
    function isTable(table) {
      return typeof table === "object" && table !== null && IsDrizzleTable in table;
    }
    function getTableName(table) {
      return table[import_table_utils.TableName];
    }
    function getTableUniqueName(table) {
      return `${table[Schema] ?? "public"}.${table[import_table_utils.TableName]}`;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/sql.cjs
var require_sql = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/sql.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name2 in all)
        __defProp(target, name2, { get: all[name2], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var sql_exports = {};
    __export(sql_exports, {
      FakePrimitiveParam: () => FakePrimitiveParam,
      Name: () => Name,
      Param: () => Param,
      Placeholder: () => Placeholder,
      SQL: () => SQL,
      StringChunk: () => StringChunk,
      View: () => View,
      fillPlaceholders: () => fillPlaceholders,
      getViewName: () => getViewName,
      isDriverValueEncoder: () => isDriverValueEncoder,
      isSQLWrapper: () => isSQLWrapper,
      isView: () => isView,
      name: () => name,
      noopDecoder: () => noopDecoder,
      noopEncoder: () => noopEncoder,
      noopMapper: () => noopMapper,
      param: () => param,
      placeholder: () => placeholder,
      sql: () => sql
    });
    module2.exports = __toCommonJS(sql_exports);
    var import_entity = require_entity();
    var import_enum = require_enum();
    var import_subquery = require_subquery();
    var import_tracing = require_tracing();
    var import_view_common = require_view_common();
    var import_column = require_column();
    var import_table = require_table();
    var FakePrimitiveParam = class {
      static [import_entity.entityKind] = "FakePrimitiveParam";
    };
    function isSQLWrapper(value) {
      return value !== null && value !== void 0 && typeof value.getSQL === "function";
    }
    function mergeQueries(queries) {
      const result = { sql: "", params: [] };
      for (const query of queries) {
        result.sql += query.sql;
        result.params.push(...query.params);
        if (query.typings?.length) {
          if (!result.typings) {
            result.typings = [];
          }
          result.typings.push(...query.typings);
        }
      }
      return result;
    }
    var StringChunk = class {
      static [import_entity.entityKind] = "StringChunk";
      value;
      constructor(value) {
        this.value = Array.isArray(value) ? value : [value];
      }
      getSQL() {
        return new SQL([this]);
      }
    };
    var SQL = class _SQL {
      constructor(queryChunks) {
        this.queryChunks = queryChunks;
        for (const chunk of queryChunks) {
          if ((0, import_entity.is)(chunk, import_table.Table)) {
            const schemaName = chunk[import_table.Table.Symbol.Schema];
            this.usedTables.push(
              schemaName === void 0 ? chunk[import_table.Table.Symbol.Name] : schemaName + "." + chunk[import_table.Table.Symbol.Name]
            );
          }
        }
      }
      static [import_entity.entityKind] = "SQL";
      /** @internal */
      decoder = noopDecoder;
      shouldInlineParams = false;
      /** @internal */
      usedTables = [];
      append(query) {
        this.queryChunks.push(...query.queryChunks);
        return this;
      }
      toQuery(config) {
        return import_tracing.tracer.startActiveSpan("drizzle.buildSQL", (span) => {
          const query = this.buildQueryFromSourceParams(this.queryChunks, config);
          span?.setAttributes({
            "drizzle.query.text": query.sql,
            "drizzle.query.params": JSON.stringify(query.params)
          });
          return query;
        });
      }
      buildQueryFromSourceParams(chunks, _config) {
        const config = Object.assign({}, _config, {
          inlineParams: _config.inlineParams || this.shouldInlineParams,
          paramStartIndex: _config.paramStartIndex || { value: 0 }
        });
        const {
          casing,
          escapeName,
          escapeParam,
          prepareTyping,
          inlineParams,
          paramStartIndex
        } = config;
        return mergeQueries(chunks.map((chunk) => {
          if ((0, import_entity.is)(chunk, StringChunk)) {
            return { sql: chunk.value.join(""), params: [] };
          }
          if ((0, import_entity.is)(chunk, Name)) {
            return { sql: escapeName(chunk.value), params: [] };
          }
          if (chunk === void 0) {
            return { sql: "", params: [] };
          }
          if (Array.isArray(chunk)) {
            const result = [new StringChunk("(")];
            for (const [i, p] of chunk.entries()) {
              result.push(p);
              if (i < chunk.length - 1) {
                result.push(new StringChunk(", "));
              }
            }
            result.push(new StringChunk(")"));
            return this.buildQueryFromSourceParams(result, config);
          }
          if ((0, import_entity.is)(chunk, _SQL)) {
            return this.buildQueryFromSourceParams(chunk.queryChunks, {
              ...config,
              inlineParams: inlineParams || chunk.shouldInlineParams
            });
          }
          if ((0, import_entity.is)(chunk, import_table.Table)) {
            const schemaName = chunk[import_table.Table.Symbol.Schema];
            const tableName = chunk[import_table.Table.Symbol.Name];
            return {
              sql: schemaName === void 0 || chunk[import_table.IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
              params: []
            };
          }
          if ((0, import_entity.is)(chunk, import_column.Column)) {
            const columnName = casing.getColumnCasing(chunk);
            if (_config.invokeSource === "indexes") {
              return { sql: escapeName(columnName), params: [] };
            }
            const schemaName = chunk.table[import_table.Table.Symbol.Schema];
            return {
              sql: chunk.table[import_table.IsAlias] || schemaName === void 0 ? escapeName(chunk.table[import_table.Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[import_table.Table.Symbol.Name]) + "." + escapeName(columnName),
              params: []
            };
          }
          if ((0, import_entity.is)(chunk, View)) {
            const schemaName = chunk[import_view_common.ViewBaseConfig].schema;
            const viewName = chunk[import_view_common.ViewBaseConfig].name;
            return {
              sql: schemaName === void 0 || chunk[import_view_common.ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
              params: []
            };
          }
          if ((0, import_entity.is)(chunk, Param)) {
            if ((0, import_entity.is)(chunk.value, Placeholder)) {
              return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
            }
            const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
            if ((0, import_entity.is)(mappedValue, _SQL)) {
              return this.buildQueryFromSourceParams([mappedValue], config);
            }
            if (inlineParams) {
              return { sql: this.mapInlineParam(mappedValue, config), params: [] };
            }
            let typings = ["none"];
            if (prepareTyping) {
              typings = [prepareTyping(chunk.encoder)];
            }
            return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
          }
          if ((0, import_entity.is)(chunk, Placeholder)) {
            return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
          }
          if ((0, import_entity.is)(chunk, _SQL.Aliased) && chunk.fieldAlias !== void 0) {
            return { sql: escapeName(chunk.fieldAlias), params: [] };
          }
          if ((0, import_entity.is)(chunk, import_subquery.Subquery)) {
            if (chunk._.isWith) {
              return { sql: escapeName(chunk._.alias), params: [] };
            }
            return this.buildQueryFromSourceParams([
              new StringChunk("("),
              chunk._.sql,
              new StringChunk(") "),
              new Name(chunk._.alias)
            ], config);
          }
          if ((0, import_enum.isPgEnum)(chunk)) {
            if (chunk.schema) {
              return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
            }
            return { sql: escapeName(chunk.enumName), params: [] };
          }
          if (isSQLWrapper(chunk)) {
            if (chunk.shouldOmitSQLParens?.()) {
              return this.buildQueryFromSourceParams([chunk.getSQL()], config);
            }
            return this.buildQueryFromSourceParams([
              new StringChunk("("),
              chunk.getSQL(),
              new StringChunk(")")
            ], config);
          }
          if (inlineParams) {
            return { sql: this.mapInlineParam(chunk, config), params: [] };
          }
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }));
      }
      mapInlineParam(chunk, { escapeString }) {
        if (chunk === null) {
          return "null";
        }
        if (typeof chunk === "number" || typeof chunk === "boolean") {
          return chunk.toString();
        }
        if (typeof chunk === "string") {
          return escapeString(chunk);
        }
        if (typeof chunk === "object") {
          const mappedValueAsString = chunk.toString();
          if (mappedValueAsString === "[object Object]") {
            return escapeString(JSON.stringify(chunk));
          }
          return escapeString(mappedValueAsString);
        }
        throw new Error("Unexpected param value: " + chunk);
      }
      getSQL() {
        return this;
      }
      as(alias) {
        if (alias === void 0) {
          return this;
        }
        return new _SQL.Aliased(this, alias);
      }
      mapWith(decoder) {
        this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
        return this;
      }
      inlineParams() {
        this.shouldInlineParams = true;
        return this;
      }
      /**
       * This method is used to conditionally include a part of the query.
       *
       * @param condition - Condition to check
       * @returns itself if the condition is `true`, otherwise `undefined`
       */
      if(condition) {
        return condition ? this : void 0;
      }
    };
    var Name = class {
      constructor(value) {
        this.value = value;
      }
      static [import_entity.entityKind] = "Name";
      brand;
      getSQL() {
        return new SQL([this]);
      }
    };
    function name(value) {
      return new Name(value);
    }
    function isDriverValueEncoder(value) {
      return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
    }
    var noopDecoder = {
      mapFromDriverValue: (value) => value
    };
    var noopEncoder = {
      mapToDriverValue: (value) => value
    };
    var noopMapper = {
      ...noopDecoder,
      ...noopEncoder
    };
    var Param = class {
      /**
       * @param value - Parameter value
       * @param encoder - Encoder to convert the value to a driver parameter
       */
      constructor(value, encoder = noopEncoder) {
        this.value = value;
        this.encoder = encoder;
      }
      static [import_entity.entityKind] = "Param";
      brand;
      getSQL() {
        return new SQL([this]);
      }
    };
    function param(value, encoder) {
      return new Param(value, encoder);
    }
    function sql(strings, ...params) {
      const queryChunks = [];
      if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
        queryChunks.push(new StringChunk(strings[0]));
      }
      for (const [paramIndex, param2] of params.entries()) {
        queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
      }
      return new SQL(queryChunks);
    }
    ((sql2) => {
      function empty() {
        return new SQL([]);
      }
      sql2.empty = empty;
      function fromList(list) {
        return new SQL(list);
      }
      sql2.fromList = fromList;
      function raw(str) {
        return new SQL([new StringChunk(str)]);
      }
      sql2.raw = raw;
      function join(chunks, separator) {
        const result = [];
        for (const [i, chunk] of chunks.entries()) {
          if (i > 0 && separator !== void 0) {
            result.push(separator);
          }
          result.push(chunk);
        }
        return new SQL(result);
      }
      sql2.join = join;
      function identifier(value) {
        return new Name(value);
      }
      sql2.identifier = identifier;
      function placeholder2(name2) {
        return new Placeholder(name2);
      }
      sql2.placeholder = placeholder2;
      function param2(value, encoder) {
        return new Param(value, encoder);
      }
      sql2.param = param2;
    })(sql || (sql = {}));
    ((SQL2) => {
      class Aliased {
        constructor(sql2, fieldAlias) {
          this.sql = sql2;
          this.fieldAlias = fieldAlias;
        }
        static [import_entity.entityKind] = "SQL.Aliased";
        /** @internal */
        isSelectionField = false;
        getSQL() {
          return this.sql;
        }
        /** @internal */
        clone() {
          return new Aliased(this.sql, this.fieldAlias);
        }
      }
      SQL2.Aliased = Aliased;
    })(SQL || (SQL = {}));
    var Placeholder = class {
      constructor(name2) {
        this.name = name2;
      }
      static [import_entity.entityKind] = "Placeholder";
      getSQL() {
        return new SQL([this]);
      }
    };
    function placeholder(name2) {
      return new Placeholder(name2);
    }
    function fillPlaceholders(params, values) {
      return params.map((p) => {
        if ((0, import_entity.is)(p, Placeholder)) {
          if (!(p.name in values)) {
            throw new Error(`No value for placeholder "${p.name}" was provided`);
          }
          return values[p.name];
        }
        if ((0, import_entity.is)(p, Param) && (0, import_entity.is)(p.value, Placeholder)) {
          if (!(p.value.name in values)) {
            throw new Error(`No value for placeholder "${p.value.name}" was provided`);
          }
          return p.encoder.mapToDriverValue(values[p.value.name]);
        }
        return p;
      });
    }
    var IsDrizzleView = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleView");
    var View = class {
      static [import_entity.entityKind] = "View";
      /** @internal */
      [import_view_common.ViewBaseConfig];
      /** @internal */
      [IsDrizzleView] = true;
      constructor({ name: name2, schema, selectedFields, query }) {
        this[import_view_common.ViewBaseConfig] = {
          name: name2,
          originalName: name2,
          schema,
          selectedFields,
          query,
          isExisting: !query,
          isAlias: false
        };
      }
      getSQL() {
        return new SQL([this]);
      }
    };
    function isView(view) {
      return typeof view === "object" && view !== null && IsDrizzleView in view;
    }
    function getViewName(view) {
      return view[import_view_common.ViewBaseConfig].name;
    }
    import_column.Column.prototype.getSQL = function() {
      return new SQL([this]);
    };
    import_table.Table.prototype.getSQL = function() {
      return new SQL([this]);
    };
    import_subquery.Subquery.prototype.getSQL = function() {
      return new SQL([this]);
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/alias.cjs
var require_alias = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/alias.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var alias_exports = {};
    __export(alias_exports, {
      ColumnAliasProxyHandler: () => ColumnAliasProxyHandler,
      RelationTableAliasProxyHandler: () => RelationTableAliasProxyHandler,
      TableAliasProxyHandler: () => TableAliasProxyHandler,
      aliasedRelation: () => aliasedRelation,
      aliasedTable: () => aliasedTable,
      aliasedTableColumn: () => aliasedTableColumn,
      mapColumnsInAliasedSQLToAlias: () => mapColumnsInAliasedSQLToAlias,
      mapColumnsInSQLToAlias: () => mapColumnsInSQLToAlias
    });
    module2.exports = __toCommonJS(alias_exports);
    var import_column = require_column();
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_table = require_table();
    var import_view_common = require_view_common();
    var ColumnAliasProxyHandler = class {
      constructor(table) {
        this.table = table;
      }
      static [import_entity.entityKind] = "ColumnAliasProxyHandler";
      get(columnObj, prop) {
        if (prop === "table") {
          return this.table;
        }
        return columnObj[prop];
      }
    };
    var TableAliasProxyHandler = class {
      constructor(alias, replaceOriginalName) {
        this.alias = alias;
        this.replaceOriginalName = replaceOriginalName;
      }
      static [import_entity.entityKind] = "TableAliasProxyHandler";
      get(target, prop) {
        if (prop === import_table.Table.Symbol.IsAlias) {
          return true;
        }
        if (prop === import_table.Table.Symbol.Name) {
          return this.alias;
        }
        if (this.replaceOriginalName && prop === import_table.Table.Symbol.OriginalName) {
          return this.alias;
        }
        if (prop === import_view_common.ViewBaseConfig) {
          return {
            ...target[import_view_common.ViewBaseConfig],
            name: this.alias,
            isAlias: true
          };
        }
        if (prop === import_table.Table.Symbol.Columns) {
          const columns = target[import_table.Table.Symbol.Columns];
          if (!columns) {
            return columns;
          }
          const proxiedColumns = {};
          Object.keys(columns).map((key) => {
            proxiedColumns[key] = new Proxy(
              columns[key],
              new ColumnAliasProxyHandler(new Proxy(target, this))
            );
          });
          return proxiedColumns;
        }
        const value = target[prop];
        if ((0, import_entity.is)(value, import_column.Column)) {
          return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
        }
        return value;
      }
    };
    var RelationTableAliasProxyHandler = class {
      constructor(alias) {
        this.alias = alias;
      }
      static [import_entity.entityKind] = "RelationTableAliasProxyHandler";
      get(target, prop) {
        if (prop === "sourceTable") {
          return aliasedTable(target.sourceTable, this.alias);
        }
        return target[prop];
      }
    };
    function aliasedTable(table, tableAlias) {
      return new Proxy(table, new TableAliasProxyHandler(tableAlias, false));
    }
    function aliasedRelation(relation, tableAlias) {
      return new Proxy(relation, new RelationTableAliasProxyHandler(tableAlias));
    }
    function aliasedTableColumn(column, tableAlias) {
      return new Proxy(
        column,
        new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false)))
      );
    }
    function mapColumnsInAliasedSQLToAlias(query, alias) {
      return new import_sql.SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
    }
    function mapColumnsInSQLToAlias(query, alias) {
      return import_sql.sql.join(query.queryChunks.map((c) => {
        if ((0, import_entity.is)(c, import_column.Column)) {
          return aliasedTableColumn(c, alias);
        }
        if ((0, import_entity.is)(c, import_sql.SQL)) {
          return mapColumnsInSQLToAlias(c, alias);
        }
        if ((0, import_entity.is)(c, import_sql.SQL.Aliased)) {
          return mapColumnsInAliasedSQLToAlias(c, alias);
        }
        return c;
      }));
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/selection-proxy.cjs
var require_selection_proxy = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/selection-proxy.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var selection_proxy_exports = {};
    __export(selection_proxy_exports, {
      SelectionProxyHandler: () => SelectionProxyHandler
    });
    module2.exports = __toCommonJS(selection_proxy_exports);
    var import_alias = require_alias();
    var import_column = require_column();
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_view_common = require_view_common();
    var SelectionProxyHandler = class _SelectionProxyHandler {
      static [import_entity.entityKind] = "SelectionProxyHandler";
      config;
      constructor(config) {
        this.config = { ...config };
      }
      get(subquery, prop) {
        if (prop === "_") {
          return {
            ...subquery["_"],
            selectedFields: new Proxy(
              subquery._.selectedFields,
              this
            )
          };
        }
        if (prop === import_view_common.ViewBaseConfig) {
          return {
            ...subquery[import_view_common.ViewBaseConfig],
            selectedFields: new Proxy(
              subquery[import_view_common.ViewBaseConfig].selectedFields,
              this
            )
          };
        }
        if (typeof prop === "symbol") {
          return subquery[prop];
        }
        const columns = (0, import_entity.is)(subquery, import_subquery.Subquery) ? subquery._.selectedFields : (0, import_entity.is)(subquery, import_sql.View) ? subquery[import_view_common.ViewBaseConfig].selectedFields : subquery;
        const value = columns[prop];
        if ((0, import_entity.is)(value, import_sql.SQL.Aliased)) {
          if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
            return value.sql;
          }
          const newValue = value.clone();
          newValue.isSelectionField = true;
          return newValue;
        }
        if ((0, import_entity.is)(value, import_sql.SQL)) {
          if (this.config.sqlBehavior === "sql") {
            return value;
          }
          throw new Error(
            `You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`
          );
        }
        if ((0, import_entity.is)(value, import_column.Column)) {
          if (this.config.alias) {
            return new Proxy(
              value,
              new import_alias.ColumnAliasProxyHandler(
                new Proxy(
                  value.table,
                  new import_alias.TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false)
                )
              )
            );
          }
          return value;
        }
        if (typeof value !== "object" || value === null) {
          return value;
        }
        return new Proxy(value, new _SelectionProxyHandler(this.config));
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/utils.cjs
var require_utils3 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    __export(utils_exports, {
      applyMixins: () => applyMixins,
      getColumnNameAndConfig: () => getColumnNameAndConfig,
      getTableColumns: () => getTableColumns,
      getTableLikeName: () => getTableLikeName,
      getViewSelectedFields: () => getViewSelectedFields,
      haveSameKeys: () => haveSameKeys,
      isConfig: () => isConfig,
      mapResultRow: () => mapResultRow,
      mapUpdateSet: () => mapUpdateSet,
      orderSelectedFields: () => orderSelectedFields,
      textDecoder: () => textDecoder
    });
    module2.exports = __toCommonJS(utils_exports);
    var import_column = require_column();
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_table = require_table();
    var import_view_common = require_view_common();
    function mapResultRow(columns, row, joinsNotNullableMap) {
      const nullifyMap = {};
      const result = columns.reduce(
        (result2, { path, field }, columnIndex) => {
          let decoder;
          if ((0, import_entity.is)(field, import_column.Column)) {
            decoder = field;
          } else if ((0, import_entity.is)(field, import_sql.SQL)) {
            decoder = field.decoder;
          } else if ((0, import_entity.is)(field, import_subquery.Subquery)) {
            decoder = field._.sql.decoder;
          } else {
            decoder = field.sql.decoder;
          }
          let node = result2;
          for (const [pathChunkIndex, pathChunk] of path.entries()) {
            if (pathChunkIndex < path.length - 1) {
              if (!(pathChunk in node)) {
                node[pathChunk] = {};
              }
              node = node[pathChunk];
            } else {
              const rawValue = row[columnIndex];
              const value = node[pathChunk] = rawValue === null ? null : decoder.mapFromDriverValue(rawValue);
              if (joinsNotNullableMap && (0, import_entity.is)(field, import_column.Column) && path.length === 2) {
                const objectName = path[0];
                if (!(objectName in nullifyMap)) {
                  nullifyMap[objectName] = value === null ? (0, import_table.getTableName)(field.table) : false;
                } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== (0, import_table.getTableName)(field.table)) {
                  nullifyMap[objectName] = false;
                }
              }
            }
          }
          return result2;
        },
        {}
      );
      if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
        for (const [objectName, tableName] of Object.entries(nullifyMap)) {
          if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
            result[objectName] = null;
          }
        }
      }
      return result;
    }
    function orderSelectedFields(fields, pathPrefix) {
      return Object.entries(fields).reduce((result, [name, field]) => {
        if (typeof name !== "string") {
          return result;
        }
        const newPath = pathPrefix ? [...pathPrefix, name] : [name];
        if ((0, import_entity.is)(field, import_column.Column) || (0, import_entity.is)(field, import_sql.SQL) || (0, import_entity.is)(field, import_sql.SQL.Aliased) || (0, import_entity.is)(field, import_subquery.Subquery)) {
          result.push({ path: newPath, field });
        } else if ((0, import_entity.is)(field, import_table.Table)) {
          result.push(...orderSelectedFields(field[import_table.Table.Symbol.Columns], newPath));
        } else {
          result.push(...orderSelectedFields(field, newPath));
        }
        return result;
      }, []);
    }
    function haveSameKeys(left, right) {
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      if (leftKeys.length !== rightKeys.length) {
        return false;
      }
      for (const [index, key] of leftKeys.entries()) {
        if (key !== rightKeys[index]) {
          return false;
        }
      }
      return true;
    }
    function mapUpdateSet(table, values) {
      const entries = Object.entries(values).filter(([, value]) => value !== void 0).map(([key, value]) => {
        if ((0, import_entity.is)(value, import_sql.SQL) || (0, import_entity.is)(value, import_column.Column)) {
          return [key, value];
        } else {
          return [key, new import_sql.Param(value, table[import_table.Table.Symbol.Columns][key])];
        }
      });
      if (entries.length === 0) {
        throw new Error("No values to set");
      }
      return Object.fromEntries(entries);
    }
    function applyMixins(baseClass, extendedClasses) {
      for (const extendedClass of extendedClasses) {
        for (const name of Object.getOwnPropertyNames(extendedClass.prototype)) {
          if (name === "constructor") continue;
          Object.defineProperty(
            baseClass.prototype,
            name,
            Object.getOwnPropertyDescriptor(extendedClass.prototype, name) || /* @__PURE__ */ Object.create(null)
          );
        }
      }
    }
    function getTableColumns(table) {
      return table[import_table.Table.Symbol.Columns];
    }
    function getViewSelectedFields(view) {
      return view[import_view_common.ViewBaseConfig].selectedFields;
    }
    function getTableLikeName(table) {
      return (0, import_entity.is)(table, import_subquery.Subquery) ? table._.alias : (0, import_entity.is)(table, import_sql.View) ? table[import_view_common.ViewBaseConfig].name : (0, import_entity.is)(table, import_sql.SQL) ? void 0 : table[import_table.Table.Symbol.IsAlias] ? table[import_table.Table.Symbol.Name] : table[import_table.Table.Symbol.BaseName];
    }
    function getColumnNameAndConfig(a, b) {
      return {
        name: typeof a === "string" && a.length > 0 ? a : "",
        config: typeof a === "object" ? a : b
      };
    }
    function isConfig(data) {
      if (typeof data !== "object" || data === null) return false;
      if (data.constructor.name !== "Object") return false;
      if ("logger" in data) {
        const type = typeof data["logger"];
        if (type !== "boolean" && (type !== "object" || typeof data["logger"]["logQuery"] !== "function") && type !== "undefined") return false;
        return true;
      }
      if ("schema" in data) {
        const type = typeof data["schema"];
        if (type !== "object" && type !== "undefined") return false;
        return true;
      }
      if ("casing" in data) {
        const type = typeof data["casing"];
        if (type !== "string" && type !== "undefined") return false;
        return true;
      }
      if ("mode" in data) {
        if (data["mode"] !== "default" || data["mode"] !== "planetscale" || data["mode"] !== void 0) return false;
        return true;
      }
      if ("connection" in data) {
        const type = typeof data["connection"];
        if (type !== "string" && type !== "object" && type !== "undefined") return false;
        return true;
      }
      if ("client" in data) {
        const type = typeof data["client"];
        if (type !== "object" && type !== "function" && type !== "undefined") return false;
        return true;
      }
      if (Object.keys(data).length === 0) return true;
      return false;
    }
    var textDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder();
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/int.common.cjs
var require_int_common = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/int.common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var int_common_exports = {};
    __export(int_common_exports, {
      PgIntColumnBaseBuilder: () => PgIntColumnBaseBuilder
    });
    module2.exports = __toCommonJS(int_common_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgIntColumnBaseBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgIntColumnBaseBuilder";
      generatedAlwaysAsIdentity(sequence) {
        if (sequence) {
          const { name, ...options } = sequence;
          this.config.generatedIdentity = {
            type: "always",
            sequenceName: name,
            sequenceOptions: options
          };
        } else {
          this.config.generatedIdentity = {
            type: "always"
          };
        }
        this.config.hasDefault = true;
        this.config.notNull = true;
        return this;
      }
      generatedByDefaultAsIdentity(sequence) {
        if (sequence) {
          const { name, ...options } = sequence;
          this.config.generatedIdentity = {
            type: "byDefault",
            sequenceName: name,
            sequenceOptions: options
          };
        } else {
          this.config.generatedIdentity = {
            type: "byDefault"
          };
        }
        this.config.hasDefault = true;
        this.config.notNull = true;
        return this;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/bigint.cjs
var require_bigint = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/bigint.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var bigint_exports = {};
    __export(bigint_exports, {
      PgBigInt53: () => PgBigInt53,
      PgBigInt53Builder: () => PgBigInt53Builder,
      PgBigInt64: () => PgBigInt64,
      PgBigInt64Builder: () => PgBigInt64Builder,
      bigint: () => bigint
    });
    module2.exports = __toCommonJS(bigint_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var import_int_common = require_int_common();
    var PgBigInt53Builder = class extends import_int_common.PgIntColumnBaseBuilder {
      static [import_entity.entityKind] = "PgBigInt53Builder";
      constructor(name) {
        super(name, "number", "PgBigInt53");
      }
      /** @internal */
      build(table) {
        return new PgBigInt53(table, this.config);
      }
    };
    var PgBigInt53 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBigInt53";
      getSQLType() {
        return "bigint";
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") {
          return value;
        }
        return Number(value);
      }
    };
    var PgBigInt64Builder = class extends import_int_common.PgIntColumnBaseBuilder {
      static [import_entity.entityKind] = "PgBigInt64Builder";
      constructor(name) {
        super(name, "bigint", "PgBigInt64");
      }
      /** @internal */
      build(table) {
        return new PgBigInt64(
          table,
          this.config
        );
      }
    };
    var PgBigInt64 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBigInt64";
      getSQLType() {
        return "bigint";
      }
      // eslint-disable-next-line unicorn/prefer-native-coercion-functions
      mapFromDriverValue(value) {
        return BigInt(value);
      }
    };
    function bigint(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (config.mode === "number") {
        return new PgBigInt53Builder(name);
      }
      return new PgBigInt64Builder(name);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/bigserial.cjs
var require_bigserial = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/bigserial.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var bigserial_exports = {};
    __export(bigserial_exports, {
      PgBigSerial53: () => PgBigSerial53,
      PgBigSerial53Builder: () => PgBigSerial53Builder,
      PgBigSerial64: () => PgBigSerial64,
      PgBigSerial64Builder: () => PgBigSerial64Builder,
      bigserial: () => bigserial
    });
    module2.exports = __toCommonJS(bigserial_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgBigSerial53Builder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgBigSerial53Builder";
      constructor(name) {
        super(name, "number", "PgBigSerial53");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgBigSerial53(
          table,
          this.config
        );
      }
    };
    var PgBigSerial53 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBigSerial53";
      getSQLType() {
        return "bigserial";
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") {
          return value;
        }
        return Number(value);
      }
    };
    var PgBigSerial64Builder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgBigSerial64Builder";
      constructor(name) {
        super(name, "bigint", "PgBigSerial64");
        this.config.hasDefault = true;
      }
      /** @internal */
      build(table) {
        return new PgBigSerial64(
          table,
          this.config
        );
      }
    };
    var PgBigSerial64 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBigSerial64";
      getSQLType() {
        return "bigserial";
      }
      // eslint-disable-next-line unicorn/prefer-native-coercion-functions
      mapFromDriverValue(value) {
        return BigInt(value);
      }
    };
    function bigserial(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (config.mode === "number") {
        return new PgBigSerial53Builder(name);
      }
      return new PgBigSerial64Builder(name);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/boolean.cjs
var require_boolean = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/boolean.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var boolean_exports = {};
    __export(boolean_exports, {
      PgBoolean: () => PgBoolean,
      PgBooleanBuilder: () => PgBooleanBuilder,
      boolean: () => boolean
    });
    module2.exports = __toCommonJS(boolean_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgBooleanBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgBooleanBuilder";
      constructor(name) {
        super(name, "boolean", "PgBoolean");
      }
      /** @internal */
      build(table) {
        return new PgBoolean(table, this.config);
      }
    };
    var PgBoolean = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBoolean";
      getSQLType() {
        return "boolean";
      }
    };
    function boolean(name) {
      return new PgBooleanBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/char.cjs
var require_char = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/char.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var char_exports = {};
    __export(char_exports, {
      PgChar: () => PgChar,
      PgCharBuilder: () => PgCharBuilder,
      char: () => char
    });
    module2.exports = __toCommonJS(char_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgCharBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgCharBuilder";
      constructor(name, config) {
        super(name, "string", "PgChar");
        this.config.length = config.length;
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgChar(
          table,
          this.config
        );
      }
    };
    var PgChar = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgChar";
      length = this.config.length;
      enumValues = this.config.enumValues;
      getSQLType() {
        return this.length === void 0 ? `char` : `char(${this.length})`;
      }
    };
    function char(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgCharBuilder(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/cidr.cjs
var require_cidr = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/cidr.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var cidr_exports = {};
    __export(cidr_exports, {
      PgCidr: () => PgCidr,
      PgCidrBuilder: () => PgCidrBuilder,
      cidr: () => cidr
    });
    module2.exports = __toCommonJS(cidr_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgCidrBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgCidrBuilder";
      constructor(name) {
        super(name, "string", "PgCidr");
      }
      /** @internal */
      build(table) {
        return new PgCidr(table, this.config);
      }
    };
    var PgCidr = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgCidr";
      getSQLType() {
        return "cidr";
      }
    };
    function cidr(name) {
      return new PgCidrBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/custom.cjs
var require_custom = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/custom.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var custom_exports = {};
    __export(custom_exports, {
      PgCustomColumn: () => PgCustomColumn,
      PgCustomColumnBuilder: () => PgCustomColumnBuilder,
      customType: () => customType
    });
    module2.exports = __toCommonJS(custom_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgCustomColumnBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgCustomColumnBuilder";
      constructor(name, fieldConfig, customTypeParams) {
        super(name, "custom", "PgCustomColumn");
        this.config.fieldConfig = fieldConfig;
        this.config.customTypeParams = customTypeParams;
      }
      /** @internal */
      build(table) {
        return new PgCustomColumn(
          table,
          this.config
        );
      }
    };
    var PgCustomColumn = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgCustomColumn";
      sqlName;
      mapTo;
      mapFrom;
      constructor(table, config) {
        super(table, config);
        this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
        this.mapTo = config.customTypeParams.toDriver;
        this.mapFrom = config.customTypeParams.fromDriver;
      }
      getSQLType() {
        return this.sqlName;
      }
      mapFromDriverValue(value) {
        return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
      }
      mapToDriverValue(value) {
        return typeof this.mapTo === "function" ? this.mapTo(value) : value;
      }
    };
    function customType(customTypeParams) {
      return (a, b) => {
        const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
        return new PgCustomColumnBuilder(name, config, customTypeParams);
      };
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/date.common.cjs
var require_date_common = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/date.common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var date_common_exports = {};
    __export(date_common_exports, {
      PgDateColumnBaseBuilder: () => PgDateColumnBaseBuilder
    });
    module2.exports = __toCommonJS(date_common_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_common = require_common();
    var PgDateColumnBaseBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgDateColumnBaseBuilder";
      defaultNow() {
        return this.default(import_sql.sql`now()`);
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/date.cjs
var require_date = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/date.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var date_exports = {};
    __export(date_exports, {
      PgDate: () => PgDate,
      PgDateBuilder: () => PgDateBuilder,
      PgDateString: () => PgDateString,
      PgDateStringBuilder: () => PgDateStringBuilder,
      date: () => date
    });
    module2.exports = __toCommonJS(date_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var import_date_common = require_date_common();
    var PgDateBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      static [import_entity.entityKind] = "PgDateBuilder";
      constructor(name) {
        super(name, "date", "PgDate");
      }
      /** @internal */
      build(table) {
        return new PgDate(table, this.config);
      }
    };
    var PgDate = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgDate";
      getSQLType() {
        return "date";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return new Date(value);
        return value;
      }
      mapToDriverValue(value) {
        return value.toISOString();
      }
    };
    var PgDateStringBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      static [import_entity.entityKind] = "PgDateStringBuilder";
      constructor(name) {
        super(name, "string", "PgDateString");
      }
      /** @internal */
      build(table) {
        return new PgDateString(
          table,
          this.config
        );
      }
    };
    var PgDateString = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgDateString";
      getSQLType() {
        return "date";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return value;
        return value.toISOString().slice(0, -14);
      }
    };
    function date(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (config?.mode === "date") {
        return new PgDateBuilder(name);
      }
      return new PgDateStringBuilder(name);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/double-precision.cjs
var require_double_precision = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/double-precision.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var double_precision_exports = {};
    __export(double_precision_exports, {
      PgDoublePrecision: () => PgDoublePrecision,
      PgDoublePrecisionBuilder: () => PgDoublePrecisionBuilder,
      doublePrecision: () => doublePrecision
    });
    module2.exports = __toCommonJS(double_precision_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgDoublePrecisionBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgDoublePrecisionBuilder";
      constructor(name) {
        super(name, "number", "PgDoublePrecision");
      }
      /** @internal */
      build(table) {
        return new PgDoublePrecision(
          table,
          this.config
        );
      }
    };
    var PgDoublePrecision = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgDoublePrecision";
      getSQLType() {
        return "double precision";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          return Number.parseFloat(value);
        }
        return value;
      }
    };
    function doublePrecision(name) {
      return new PgDoublePrecisionBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/inet.cjs
var require_inet = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/inet.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var inet_exports = {};
    __export(inet_exports, {
      PgInet: () => PgInet,
      PgInetBuilder: () => PgInetBuilder,
      inet: () => inet
    });
    module2.exports = __toCommonJS(inet_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgInetBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgInetBuilder";
      constructor(name) {
        super(name, "string", "PgInet");
      }
      /** @internal */
      build(table) {
        return new PgInet(table, this.config);
      }
    };
    var PgInet = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgInet";
      getSQLType() {
        return "inet";
      }
    };
    function inet(name) {
      return new PgInetBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/integer.cjs
var require_integer = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/integer.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var integer_exports = {};
    __export(integer_exports, {
      PgInteger: () => PgInteger,
      PgIntegerBuilder: () => PgIntegerBuilder,
      integer: () => integer
    });
    module2.exports = __toCommonJS(integer_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var import_int_common = require_int_common();
    var PgIntegerBuilder = class extends import_int_common.PgIntColumnBaseBuilder {
      static [import_entity.entityKind] = "PgIntegerBuilder";
      constructor(name) {
        super(name, "number", "PgInteger");
      }
      /** @internal */
      build(table) {
        return new PgInteger(table, this.config);
      }
    };
    var PgInteger = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgInteger";
      getSQLType() {
        return "integer";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          return Number.parseInt(value);
        }
        return value;
      }
    };
    function integer(name) {
      return new PgIntegerBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/interval.cjs
var require_interval = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/interval.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var interval_exports = {};
    __export(interval_exports, {
      PgInterval: () => PgInterval,
      PgIntervalBuilder: () => PgIntervalBuilder,
      interval: () => interval
    });
    module2.exports = __toCommonJS(interval_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgIntervalBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgIntervalBuilder";
      constructor(name, intervalConfig) {
        super(name, "string", "PgInterval");
        this.config.intervalConfig = intervalConfig;
      }
      /** @internal */
      build(table) {
        return new PgInterval(table, this.config);
      }
    };
    var PgInterval = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgInterval";
      fields = this.config.intervalConfig.fields;
      precision = this.config.intervalConfig.precision;
      getSQLType() {
        const fields = this.fields ? ` ${this.fields}` : "";
        const precision = this.precision ? `(${this.precision})` : "";
        return `interval${fields}${precision}`;
      }
    };
    function interval(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgIntervalBuilder(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/json.cjs
var require_json = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/json.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var json_exports = {};
    __export(json_exports, {
      PgJson: () => PgJson,
      PgJsonBuilder: () => PgJsonBuilder,
      json: () => json
    });
    module2.exports = __toCommonJS(json_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgJsonBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgJsonBuilder";
      constructor(name) {
        super(name, "json", "PgJson");
      }
      /** @internal */
      build(table) {
        return new PgJson(table, this.config);
      }
    };
    var PgJson = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgJson";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "json";
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    };
    function json(name) {
      return new PgJsonBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/jsonb.cjs
var require_jsonb = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/jsonb.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var jsonb_exports = {};
    __export(jsonb_exports, {
      PgJsonb: () => PgJsonb,
      PgJsonbBuilder: () => PgJsonbBuilder,
      jsonb: () => jsonb
    });
    module2.exports = __toCommonJS(jsonb_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgJsonbBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgJsonbBuilder";
      constructor(name) {
        super(name, "json", "PgJsonb");
      }
      /** @internal */
      build(table) {
        return new PgJsonb(table, this.config);
      }
    };
    var PgJsonb = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgJsonb";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "jsonb";
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    };
    function jsonb(name) {
      return new PgJsonbBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/line.cjs
var require_line = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/line.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var line_exports = {};
    __export(line_exports, {
      PgLineABC: () => PgLineABC,
      PgLineABCBuilder: () => PgLineABCBuilder,
      PgLineBuilder: () => PgLineBuilder,
      PgLineTuple: () => PgLineTuple,
      line: () => line
    });
    module2.exports = __toCommonJS(line_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgLineBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgLineBuilder";
      constructor(name) {
        super(name, "array", "PgLine");
      }
      /** @internal */
      build(table) {
        return new PgLineTuple(
          table,
          this.config
        );
      }
    };
    var PgLineTuple = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgLine";
      getSQLType() {
        return "line";
      }
      mapFromDriverValue(value) {
        const [a, b, c] = value.slice(1, -1).split(",");
        return [Number.parseFloat(a), Number.parseFloat(b), Number.parseFloat(c)];
      }
      mapToDriverValue(value) {
        return `{${value[0]},${value[1]},${value[2]}}`;
      }
    };
    var PgLineABCBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgLineABCBuilder";
      constructor(name) {
        super(name, "json", "PgLineABC");
      }
      /** @internal */
      build(table) {
        return new PgLineABC(
          table,
          this.config
        );
      }
    };
    var PgLineABC = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgLineABC";
      getSQLType() {
        return "line";
      }
      mapFromDriverValue(value) {
        const [a, b, c] = value.slice(1, -1).split(",");
        return { a: Number.parseFloat(a), b: Number.parseFloat(b), c: Number.parseFloat(c) };
      }
      mapToDriverValue(value) {
        return `{${value.a},${value.b},${value.c}}`;
      }
    };
    function line(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (!config?.mode || config.mode === "tuple") {
        return new PgLineBuilder(name);
      }
      return new PgLineABCBuilder(name);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/macaddr.cjs
var require_macaddr = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/macaddr.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var macaddr_exports = {};
    __export(macaddr_exports, {
      PgMacaddr: () => PgMacaddr,
      PgMacaddrBuilder: () => PgMacaddrBuilder,
      macaddr: () => macaddr
    });
    module2.exports = __toCommonJS(macaddr_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgMacaddrBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgMacaddrBuilder";
      constructor(name) {
        super(name, "string", "PgMacaddr");
      }
      /** @internal */
      build(table) {
        return new PgMacaddr(table, this.config);
      }
    };
    var PgMacaddr = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgMacaddr";
      getSQLType() {
        return "macaddr";
      }
    };
    function macaddr(name) {
      return new PgMacaddrBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/macaddr8.cjs
var require_macaddr8 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/macaddr8.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var macaddr8_exports = {};
    __export(macaddr8_exports, {
      PgMacaddr8: () => PgMacaddr8,
      PgMacaddr8Builder: () => PgMacaddr8Builder,
      macaddr8: () => macaddr8
    });
    module2.exports = __toCommonJS(macaddr8_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgMacaddr8Builder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgMacaddr8Builder";
      constructor(name) {
        super(name, "string", "PgMacaddr8");
      }
      /** @internal */
      build(table) {
        return new PgMacaddr8(table, this.config);
      }
    };
    var PgMacaddr8 = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgMacaddr8";
      getSQLType() {
        return "macaddr8";
      }
    };
    function macaddr8(name) {
      return new PgMacaddr8Builder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/numeric.cjs
var require_numeric = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/numeric.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var numeric_exports = {};
    __export(numeric_exports, {
      PgNumeric: () => PgNumeric,
      PgNumericBigInt: () => PgNumericBigInt,
      PgNumericBigIntBuilder: () => PgNumericBigIntBuilder,
      PgNumericBuilder: () => PgNumericBuilder,
      PgNumericNumber: () => PgNumericNumber,
      PgNumericNumberBuilder: () => PgNumericNumberBuilder,
      decimal: () => decimal,
      numeric: () => numeric
    });
    module2.exports = __toCommonJS(numeric_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgNumericBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgNumericBuilder";
      constructor(name, precision, scale) {
        super(name, "string", "PgNumeric");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumeric(table, this.config);
      }
    };
    var PgNumeric = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgNumeric";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return value;
        return String(value);
      }
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    var PgNumericNumberBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgNumericNumberBuilder";
      constructor(name, precision, scale) {
        super(name, "number", "PgNumericNumber");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumericNumber(
          table,
          this.config
        );
      }
    };
    var PgNumericNumber = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgNumericNumber";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") return value;
        return Number(value);
      }
      mapToDriverValue = String;
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    var PgNumericBigIntBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgNumericBigIntBuilder";
      constructor(name, precision, scale) {
        super(name, "bigint", "PgNumericBigInt");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumericBigInt(
          table,
          this.config
        );
      }
    };
    var PgNumericBigInt = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgNumericBigInt";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue = BigInt;
      mapToDriverValue = String;
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    function numeric(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      const mode = config?.mode;
      return mode === "number" ? new PgNumericNumberBuilder(name, config?.precision, config?.scale) : mode === "bigint" ? new PgNumericBigIntBuilder(name, config?.precision, config?.scale) : new PgNumericBuilder(name, config?.precision, config?.scale);
    }
    var decimal = numeric;
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/point.cjs
var require_point = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/point.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var point_exports = {};
    __export(point_exports, {
      PgPointObject: () => PgPointObject,
      PgPointObjectBuilder: () => PgPointObjectBuilder,
      PgPointTuple: () => PgPointTuple,
      PgPointTupleBuilder: () => PgPointTupleBuilder,
      point: () => point
    });
    module2.exports = __toCommonJS(point_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgPointTupleBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgPointTupleBuilder";
      constructor(name) {
        super(name, "array", "PgPointTuple");
      }
      /** @internal */
      build(table) {
        return new PgPointTuple(
          table,
          this.config
        );
      }
    };
    var PgPointTuple = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgPointTuple";
      getSQLType() {
        return "point";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          const [x, y] = value.slice(1, -1).split(",");
          return [Number.parseFloat(x), Number.parseFloat(y)];
        }
        return [value.x, value.y];
      }
      mapToDriverValue(value) {
        return `(${value[0]},${value[1]})`;
      }
    };
    var PgPointObjectBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgPointObjectBuilder";
      constructor(name) {
        super(name, "json", "PgPointObject");
      }
      /** @internal */
      build(table) {
        return new PgPointObject(
          table,
          this.config
        );
      }
    };
    var PgPointObject = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgPointObject";
      getSQLType() {
        return "point";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          const [x, y] = value.slice(1, -1).split(",");
          return { x: Number.parseFloat(x), y: Number.parseFloat(y) };
        }
        return value;
      }
      mapToDriverValue(value) {
        return `(${value.x},${value.y})`;
      }
    };
    function point(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (!config?.mode || config.mode === "tuple") {
        return new PgPointTupleBuilder(name);
      }
      return new PgPointObjectBuilder(name);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/postgis_extension/utils.cjs
var require_utils4 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/postgis_extension/utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    __export(utils_exports, {
      parseEWKB: () => parseEWKB
    });
    module2.exports = __toCommonJS(utils_exports);
    function hexToBytes(hex) {
      const bytes = [];
      for (let c = 0; c < hex.length; c += 2) {
        bytes.push(Number.parseInt(hex.slice(c, c + 2), 16));
      }
      return new Uint8Array(bytes);
    }
    function bytesToFloat64(bytes, offset) {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      for (let i = 0; i < 8; i++) {
        view.setUint8(i, bytes[offset + i]);
      }
      return view.getFloat64(0, true);
    }
    function parseEWKB(hex) {
      const bytes = hexToBytes(hex);
      let offset = 0;
      const byteOrder = bytes[offset];
      offset += 1;
      const view = new DataView(bytes.buffer);
      const geomType = view.getUint32(offset, byteOrder === 1);
      offset += 4;
      let _srid;
      if (geomType & 536870912) {
        _srid = view.getUint32(offset, byteOrder === 1);
        offset += 4;
      }
      if ((geomType & 65535) === 1) {
        const x = bytesToFloat64(bytes, offset);
        offset += 8;
        const y = bytesToFloat64(bytes, offset);
        offset += 8;
        return [x, y];
      }
      throw new Error("Unsupported geometry type");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/postgis_extension/geometry.cjs
var require_geometry = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/postgis_extension/geometry.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var geometry_exports = {};
    __export(geometry_exports, {
      PgGeometry: () => PgGeometry,
      PgGeometryBuilder: () => PgGeometryBuilder,
      PgGeometryObject: () => PgGeometryObject,
      PgGeometryObjectBuilder: () => PgGeometryObjectBuilder,
      geometry: () => geometry
    });
    module2.exports = __toCommonJS(geometry_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var import_utils2 = require_utils4();
    var PgGeometryBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgGeometryBuilder";
      constructor(name) {
        super(name, "array", "PgGeometry");
      }
      /** @internal */
      build(table) {
        return new PgGeometry(
          table,
          this.config
        );
      }
    };
    var PgGeometry = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgGeometry";
      getSQLType() {
        return "geometry(point)";
      }
      mapFromDriverValue(value) {
        return (0, import_utils2.parseEWKB)(value);
      }
      mapToDriverValue(value) {
        return `point(${value[0]} ${value[1]})`;
      }
    };
    var PgGeometryObjectBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgGeometryObjectBuilder";
      constructor(name) {
        super(name, "json", "PgGeometryObject");
      }
      /** @internal */
      build(table) {
        return new PgGeometryObject(
          table,
          this.config
        );
      }
    };
    var PgGeometryObject = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgGeometryObject";
      getSQLType() {
        return "geometry(point)";
      }
      mapFromDriverValue(value) {
        const parsed = (0, import_utils2.parseEWKB)(value);
        return { x: parsed[0], y: parsed[1] };
      }
      mapToDriverValue(value) {
        return `point(${value.x} ${value.y})`;
      }
    };
    function geometry(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (!config?.mode || config.mode === "tuple") {
        return new PgGeometryBuilder(name);
      }
      return new PgGeometryObjectBuilder(name);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/real.cjs
var require_real = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/real.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var real_exports = {};
    __export(real_exports, {
      PgReal: () => PgReal,
      PgRealBuilder: () => PgRealBuilder,
      real: () => real
    });
    module2.exports = __toCommonJS(real_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgRealBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgRealBuilder";
      constructor(name, length) {
        super(name, "number", "PgReal");
        this.config.length = length;
      }
      /** @internal */
      build(table) {
        return new PgReal(table, this.config);
      }
    };
    var PgReal = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgReal";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "real";
      }
      mapFromDriverValue = (value) => {
        if (typeof value === "string") {
          return Number.parseFloat(value);
        }
        return value;
      };
    };
    function real(name) {
      return new PgRealBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/serial.cjs
var require_serial = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/serial.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var serial_exports = {};
    __export(serial_exports, {
      PgSerial: () => PgSerial,
      PgSerialBuilder: () => PgSerialBuilder,
      serial: () => serial
    });
    module2.exports = __toCommonJS(serial_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgSerialBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgSerialBuilder";
      constructor(name) {
        super(name, "number", "PgSerial");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgSerial(table, this.config);
      }
    };
    var PgSerial = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgSerial";
      getSQLType() {
        return "serial";
      }
    };
    function serial(name) {
      return new PgSerialBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/smallint.cjs
var require_smallint = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/smallint.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var smallint_exports = {};
    __export(smallint_exports, {
      PgSmallInt: () => PgSmallInt,
      PgSmallIntBuilder: () => PgSmallIntBuilder,
      smallint: () => smallint
    });
    module2.exports = __toCommonJS(smallint_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var import_int_common = require_int_common();
    var PgSmallIntBuilder = class extends import_int_common.PgIntColumnBaseBuilder {
      static [import_entity.entityKind] = "PgSmallIntBuilder";
      constructor(name) {
        super(name, "number", "PgSmallInt");
      }
      /** @internal */
      build(table) {
        return new PgSmallInt(table, this.config);
      }
    };
    var PgSmallInt = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgSmallInt";
      getSQLType() {
        return "smallint";
      }
      mapFromDriverValue = (value) => {
        if (typeof value === "string") {
          return Number(value);
        }
        return value;
      };
    };
    function smallint(name) {
      return new PgSmallIntBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/smallserial.cjs
var require_smallserial = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/smallserial.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var smallserial_exports = {};
    __export(smallserial_exports, {
      PgSmallSerial: () => PgSmallSerial,
      PgSmallSerialBuilder: () => PgSmallSerialBuilder,
      smallserial: () => smallserial
    });
    module2.exports = __toCommonJS(smallserial_exports);
    var import_entity = require_entity();
    var import_common = require_common();
    var PgSmallSerialBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgSmallSerialBuilder";
      constructor(name) {
        super(name, "number", "PgSmallSerial");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgSmallSerial(
          table,
          this.config
        );
      }
    };
    var PgSmallSerial = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgSmallSerial";
      getSQLType() {
        return "smallserial";
      }
    };
    function smallserial(name) {
      return new PgSmallSerialBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/text.cjs
var require_text = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/text.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var text_exports = {};
    __export(text_exports, {
      PgText: () => PgText,
      PgTextBuilder: () => PgTextBuilder,
      text: () => text
    });
    module2.exports = __toCommonJS(text_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgTextBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgTextBuilder";
      constructor(name, config) {
        super(name, "string", "PgText");
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgText(table, this.config);
      }
    };
    var PgText = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgText";
      enumValues = this.config.enumValues;
      getSQLType() {
        return "text";
      }
    };
    function text(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgTextBuilder(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/time.cjs
var require_time = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/time.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var time_exports = {};
    __export(time_exports, {
      PgTime: () => PgTime,
      PgTimeBuilder: () => PgTimeBuilder,
      time: () => time
    });
    module2.exports = __toCommonJS(time_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var import_date_common = require_date_common();
    var PgTimeBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      constructor(name, withTimezone, precision) {
        super(name, "string", "PgTime");
        this.withTimezone = withTimezone;
        this.precision = precision;
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      static [import_entity.entityKind] = "PgTimeBuilder";
      /** @internal */
      build(table) {
        return new PgTime(table, this.config);
      }
    };
    var PgTime = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgTime";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : `(${this.precision})`;
        return `time${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
    };
    function time(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgTimeBuilder(name, config.withTimezone ?? false, config.precision);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/timestamp.cjs
var require_timestamp = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/timestamp.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var timestamp_exports = {};
    __export(timestamp_exports, {
      PgTimestamp: () => PgTimestamp,
      PgTimestampBuilder: () => PgTimestampBuilder,
      PgTimestampString: () => PgTimestampString,
      PgTimestampStringBuilder: () => PgTimestampStringBuilder,
      timestamp: () => timestamp
    });
    module2.exports = __toCommonJS(timestamp_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var import_date_common = require_date_common();
    var PgTimestampBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      static [import_entity.entityKind] = "PgTimestampBuilder";
      constructor(name, withTimezone, precision) {
        super(name, "date", "PgTimestamp");
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      /** @internal */
      build(table) {
        return new PgTimestamp(table, this.config);
      }
    };
    var PgTimestamp = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgTimestamp";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : ` (${this.precision})`;
        return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return new Date(this.withTimezone ? value : value + "+0000");
        return value;
      }
      mapToDriverValue = (value) => {
        return value.toISOString();
      };
    };
    var PgTimestampStringBuilder = class extends import_date_common.PgDateColumnBaseBuilder {
      static [import_entity.entityKind] = "PgTimestampStringBuilder";
      constructor(name, withTimezone, precision) {
        super(name, "string", "PgTimestampString");
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      /** @internal */
      build(table) {
        return new PgTimestampString(
          table,
          this.config
        );
      }
    };
    var PgTimestampString = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgTimestampString";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : `(${this.precision})`;
        return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return value;
        const shortened = value.toISOString().slice(0, -1).replace("T", " ");
        if (this.withTimezone) {
          const offset = value.getTimezoneOffset();
          const sign = offset <= 0 ? "+" : "-";
          return `${shortened}${sign}${Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0")}`;
        }
        return shortened;
      }
    };
    function timestamp(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      if (config?.mode === "string") {
        return new PgTimestampStringBuilder(name, config.withTimezone ?? false, config.precision);
      }
      return new PgTimestampBuilder(name, config?.withTimezone ?? false, config?.precision);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/uuid.cjs
var require_uuid = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/uuid.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var uuid_exports = {};
    __export(uuid_exports, {
      PgUUID: () => PgUUID,
      PgUUIDBuilder: () => PgUUIDBuilder,
      uuid: () => uuid
    });
    module2.exports = __toCommonJS(uuid_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_common = require_common();
    var PgUUIDBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgUUIDBuilder";
      constructor(name) {
        super(name, "string", "PgUUID");
      }
      /**
       * Adds `default gen_random_uuid()` to the column definition.
       */
      defaultRandom() {
        return this.default(import_sql.sql`gen_random_uuid()`);
      }
      /** @internal */
      build(table) {
        return new PgUUID(table, this.config);
      }
    };
    var PgUUID = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgUUID";
      getSQLType() {
        return "uuid";
      }
    };
    function uuid(name) {
      return new PgUUIDBuilder(name ?? "");
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/varchar.cjs
var require_varchar = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/varchar.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var varchar_exports = {};
    __export(varchar_exports, {
      PgVarchar: () => PgVarchar,
      PgVarcharBuilder: () => PgVarcharBuilder,
      varchar: () => varchar
    });
    module2.exports = __toCommonJS(varchar_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgVarcharBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgVarcharBuilder";
      constructor(name, config) {
        super(name, "string", "PgVarchar");
        this.config.length = config.length;
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgVarchar(
          table,
          this.config
        );
      }
    };
    var PgVarchar = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgVarchar";
      length = this.config.length;
      enumValues = this.config.enumValues;
      getSQLType() {
        return this.length === void 0 ? `varchar` : `varchar(${this.length})`;
      }
    };
    function varchar(a, b = {}) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgVarcharBuilder(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/vector_extension/bit.cjs
var require_bit = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/vector_extension/bit.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var bit_exports = {};
    __export(bit_exports, {
      PgBinaryVector: () => PgBinaryVector,
      PgBinaryVectorBuilder: () => PgBinaryVectorBuilder,
      bit: () => bit
    });
    module2.exports = __toCommonJS(bit_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgBinaryVectorBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgBinaryVectorBuilder";
      constructor(name, config) {
        super(name, "string", "PgBinaryVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgBinaryVector(
          table,
          this.config
        );
      }
    };
    var PgBinaryVector = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgBinaryVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `bit(${this.dimensions})`;
      }
    };
    function bit(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgBinaryVectorBuilder(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/vector_extension/halfvec.cjs
var require_halfvec = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/vector_extension/halfvec.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var halfvec_exports = {};
    __export(halfvec_exports, {
      PgHalfVector: () => PgHalfVector,
      PgHalfVectorBuilder: () => PgHalfVectorBuilder,
      halfvec: () => halfvec
    });
    module2.exports = __toCommonJS(halfvec_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgHalfVectorBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgHalfVectorBuilder";
      constructor(name, config) {
        super(name, "array", "PgHalfVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgHalfVector(
          table,
          this.config
        );
      }
    };
    var PgHalfVector = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgHalfVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `halfvec(${this.dimensions})`;
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        return value.slice(1, -1).split(",").map((v) => Number.parseFloat(v));
      }
    };
    function halfvec(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgHalfVectorBuilder(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/vector_extension/sparsevec.cjs
var require_sparsevec = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/vector_extension/sparsevec.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var sparsevec_exports = {};
    __export(sparsevec_exports, {
      PgSparseVector: () => PgSparseVector,
      PgSparseVectorBuilder: () => PgSparseVectorBuilder,
      sparsevec: () => sparsevec
    });
    module2.exports = __toCommonJS(sparsevec_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgSparseVectorBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgSparseVectorBuilder";
      constructor(name, config) {
        super(name, "string", "PgSparseVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgSparseVector(
          table,
          this.config
        );
      }
    };
    var PgSparseVector = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgSparseVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `sparsevec(${this.dimensions})`;
      }
    };
    function sparsevec(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgSparseVectorBuilder(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.cjs
var require_vector = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var vector_exports = {};
    __export(vector_exports, {
      PgVector: () => PgVector,
      PgVectorBuilder: () => PgVectorBuilder,
      vector: () => vector
    });
    module2.exports = __toCommonJS(vector_exports);
    var import_entity = require_entity();
    var import_utils = require_utils3();
    var import_common = require_common();
    var PgVectorBuilder = class extends import_common.PgColumnBuilder {
      static [import_entity.entityKind] = "PgVectorBuilder";
      constructor(name, config) {
        super(name, "array", "PgVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgVector(
          table,
          this.config
        );
      }
    };
    var PgVector = class extends import_common.PgColumn {
      static [import_entity.entityKind] = "PgVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `vector(${this.dimensions})`;
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        return value.slice(1, -1).split(",").map((v) => Number.parseFloat(v));
      }
    };
    function vector(a, b) {
      const { name, config } = (0, import_utils.getColumnNameAndConfig)(a, b);
      return new PgVectorBuilder(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/all.cjs
var require_all = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/all.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var all_exports = {};
    __export(all_exports, {
      getPgColumnBuilders: () => getPgColumnBuilders
    });
    module2.exports = __toCommonJS(all_exports);
    var import_bigint = require_bigint();
    var import_bigserial = require_bigserial();
    var import_boolean = require_boolean();
    var import_char = require_char();
    var import_cidr = require_cidr();
    var import_custom = require_custom();
    var import_date = require_date();
    var import_double_precision = require_double_precision();
    var import_inet = require_inet();
    var import_integer = require_integer();
    var import_interval = require_interval();
    var import_json = require_json();
    var import_jsonb = require_jsonb();
    var import_line = require_line();
    var import_macaddr = require_macaddr();
    var import_macaddr8 = require_macaddr8();
    var import_numeric = require_numeric();
    var import_point = require_point();
    var import_geometry = require_geometry();
    var import_real = require_real();
    var import_serial = require_serial();
    var import_smallint = require_smallint();
    var import_smallserial = require_smallserial();
    var import_text = require_text();
    var import_time = require_time();
    var import_timestamp = require_timestamp();
    var import_uuid = require_uuid();
    var import_varchar = require_varchar();
    var import_bit = require_bit();
    var import_halfvec = require_halfvec();
    var import_sparsevec = require_sparsevec();
    var import_vector = require_vector();
    function getPgColumnBuilders() {
      return {
        bigint: import_bigint.bigint,
        bigserial: import_bigserial.bigserial,
        boolean: import_boolean.boolean,
        char: import_char.char,
        cidr: import_cidr.cidr,
        customType: import_custom.customType,
        date: import_date.date,
        doublePrecision: import_double_precision.doublePrecision,
        inet: import_inet.inet,
        integer: import_integer.integer,
        interval: import_interval.interval,
        json: import_json.json,
        jsonb: import_jsonb.jsonb,
        line: import_line.line,
        macaddr: import_macaddr.macaddr,
        macaddr8: import_macaddr8.macaddr8,
        numeric: import_numeric.numeric,
        point: import_point.point,
        geometry: import_geometry.geometry,
        real: import_real.real,
        serial: import_serial.serial,
        smallint: import_smallint.smallint,
        smallserial: import_smallserial.smallserial,
        text: import_text.text,
        time: import_time.time,
        timestamp: import_timestamp.timestamp,
        uuid: import_uuid.uuid,
        varchar: import_varchar.varchar,
        bit: import_bit.bit,
        halfvec: import_halfvec.halfvec,
        sparsevec: import_sparsevec.sparsevec,
        vector: import_vector.vector
      };
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/table.cjs
var require_table2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/table.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var table_exports = {};
    __export(table_exports, {
      EnableRLS: () => EnableRLS,
      InlineForeignKeys: () => InlineForeignKeys,
      PgTable: () => PgTable,
      pgTable: () => pgTable,
      pgTableCreator: () => pgTableCreator,
      pgTableWithSchema: () => pgTableWithSchema
    });
    module2.exports = __toCommonJS(table_exports);
    var import_entity = require_entity();
    var import_table = require_table();
    var import_all = require_all();
    var InlineForeignKeys = /* @__PURE__ */ Symbol.for("drizzle:PgInlineForeignKeys");
    var EnableRLS = /* @__PURE__ */ Symbol.for("drizzle:EnableRLS");
    var PgTable = class extends import_table.Table {
      static [import_entity.entityKind] = "PgTable";
      /** @internal */
      static Symbol = Object.assign({}, import_table.Table.Symbol, {
        InlineForeignKeys,
        EnableRLS
      });
      /**@internal */
      [InlineForeignKeys] = [];
      /** @internal */
      [EnableRLS] = false;
      /** @internal */
      [import_table.Table.Symbol.ExtraConfigBuilder] = void 0;
      /** @internal */
      [import_table.Table.Symbol.ExtraConfigColumns] = {};
    };
    function pgTableWithSchema(name, columns, extraConfig, schema, baseName = name) {
      const rawTable = new PgTable(name, schema, baseName);
      const parsedColumns = typeof columns === "function" ? columns((0, import_all.getPgColumnBuilders)()) : columns;
      const builtColumns = Object.fromEntries(
        Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
          const colBuilder = colBuilderBase;
          colBuilder.setName(name2);
          const column = colBuilder.build(rawTable);
          rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
          return [name2, column];
        })
      );
      const builtColumnsForExtraConfig = Object.fromEntries(
        Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
          const colBuilder = colBuilderBase;
          colBuilder.setName(name2);
          const column = colBuilder.buildExtraConfigColumn(rawTable);
          return [name2, column];
        })
      );
      const table = Object.assign(rawTable, builtColumns);
      table[import_table.Table.Symbol.Columns] = builtColumns;
      table[import_table.Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;
      if (extraConfig) {
        table[PgTable.Symbol.ExtraConfigBuilder] = extraConfig;
      }
      return Object.assign(table, {
        enableRLS: () => {
          table[PgTable.Symbol.EnableRLS] = true;
          return table;
        }
      });
    }
    var pgTable = (name, columns, extraConfig) => {
      return pgTableWithSchema(name, columns, extraConfig, void 0);
    };
    function pgTableCreator(customizeTableName) {
      return (name, columns, extraConfig) => {
        return pgTableWithSchema(customizeTableName(name), columns, extraConfig, void 0, name);
      };
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/checks.cjs
var require_checks = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/checks.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var checks_exports = {};
    __export(checks_exports, {
      Check: () => Check,
      CheckBuilder: () => CheckBuilder,
      check: () => check
    });
    module2.exports = __toCommonJS(checks_exports);
    var import_entity = require_entity();
    var CheckBuilder = class {
      constructor(name, value) {
        this.name = name;
        this.value = value;
      }
      static [import_entity.entityKind] = "PgCheckBuilder";
      brand;
      /** @internal */
      build(table) {
        return new Check(table, this);
      }
    };
    var Check = class {
      constructor(table, builder) {
        this.table = table;
        this.name = builder.name;
        this.value = builder.value;
      }
      static [import_entity.entityKind] = "PgCheck";
      name;
      value;
    };
    function check(name, value) {
      return new CheckBuilder(name, value);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/index.cjs
var require_columns = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/columns/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var columns_exports = {};
    module2.exports = __toCommonJS(columns_exports);
    __reExport(columns_exports, require_bigint(), module2.exports);
    __reExport(columns_exports, require_bigserial(), module2.exports);
    __reExport(columns_exports, require_boolean(), module2.exports);
    __reExport(columns_exports, require_char(), module2.exports);
    __reExport(columns_exports, require_cidr(), module2.exports);
    __reExport(columns_exports, require_common(), module2.exports);
    __reExport(columns_exports, require_custom(), module2.exports);
    __reExport(columns_exports, require_date(), module2.exports);
    __reExport(columns_exports, require_double_precision(), module2.exports);
    __reExport(columns_exports, require_enum(), module2.exports);
    __reExport(columns_exports, require_inet(), module2.exports);
    __reExport(columns_exports, require_int_common(), module2.exports);
    __reExport(columns_exports, require_integer(), module2.exports);
    __reExport(columns_exports, require_interval(), module2.exports);
    __reExport(columns_exports, require_json(), module2.exports);
    __reExport(columns_exports, require_jsonb(), module2.exports);
    __reExport(columns_exports, require_line(), module2.exports);
    __reExport(columns_exports, require_macaddr(), module2.exports);
    __reExport(columns_exports, require_macaddr8(), module2.exports);
    __reExport(columns_exports, require_numeric(), module2.exports);
    __reExport(columns_exports, require_point(), module2.exports);
    __reExport(columns_exports, require_geometry(), module2.exports);
    __reExport(columns_exports, require_real(), module2.exports);
    __reExport(columns_exports, require_serial(), module2.exports);
    __reExport(columns_exports, require_smallint(), module2.exports);
    __reExport(columns_exports, require_smallserial(), module2.exports);
    __reExport(columns_exports, require_text(), module2.exports);
    __reExport(columns_exports, require_time(), module2.exports);
    __reExport(columns_exports, require_timestamp(), module2.exports);
    __reExport(columns_exports, require_uuid(), module2.exports);
    __reExport(columns_exports, require_varchar(), module2.exports);
    __reExport(columns_exports, require_bit(), module2.exports);
    __reExport(columns_exports, require_halfvec(), module2.exports);
    __reExport(columns_exports, require_sparsevec(), module2.exports);
    __reExport(columns_exports, require_vector(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/indexes.cjs
var require_indexes = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/indexes.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var indexes_exports = {};
    __export(indexes_exports, {
      Index: () => Index,
      IndexBuilder: () => IndexBuilder,
      IndexBuilderOn: () => IndexBuilderOn,
      index: () => index,
      uniqueIndex: () => uniqueIndex
    });
    module2.exports = __toCommonJS(indexes_exports);
    var import_sql = require_sql();
    var import_entity = require_entity();
    var import_columns = require_columns();
    var IndexBuilderOn = class {
      constructor(unique, name) {
        this.unique = unique;
        this.name = name;
      }
      static [import_entity.entityKind] = "PgIndexBuilderOn";
      on(...columns) {
        return new IndexBuilder(
          columns.map((it) => {
            if ((0, import_entity.is)(it, import_sql.SQL)) {
              return it;
            }
            it = it;
            const clonedIndexedColumn = new import_columns.IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
            it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
            return clonedIndexedColumn;
          }),
          this.unique,
          false,
          this.name
        );
      }
      onOnly(...columns) {
        return new IndexBuilder(
          columns.map((it) => {
            if ((0, import_entity.is)(it, import_sql.SQL)) {
              return it;
            }
            it = it;
            const clonedIndexedColumn = new import_columns.IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
            it.indexConfig = it.defaultConfig;
            return clonedIndexedColumn;
          }),
          this.unique,
          true,
          this.name
        );
      }
      /**
       * Specify what index method to use. Choices are `btree`, `hash`, `gist`, `spgist`, `gin`, `brin`, or user-installed access methods like `bloom`. The default method is `btree.
       *
       * If you have the `pg_vector` extension installed in your database, you can use the `hnsw` and `ivfflat` options, which are predefined types.
       *
       * **You can always specify any string you want in the method, in case Drizzle doesn't have it natively in its types**
       *
       * @param method The name of the index method to be used
       * @param columns
       * @returns
       */
      using(method, ...columns) {
        return new IndexBuilder(
          columns.map((it) => {
            if ((0, import_entity.is)(it, import_sql.SQL)) {
              return it;
            }
            it = it;
            const clonedIndexedColumn = new import_columns.IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
            it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
            return clonedIndexedColumn;
          }),
          this.unique,
          true,
          this.name,
          method
        );
      }
    };
    var IndexBuilder = class {
      static [import_entity.entityKind] = "PgIndexBuilder";
      /** @internal */
      config;
      constructor(columns, unique, only, name, method = "btree") {
        this.config = {
          name,
          columns,
          unique,
          only,
          method
        };
      }
      concurrently() {
        this.config.concurrently = true;
        return this;
      }
      with(obj) {
        this.config.with = obj;
        return this;
      }
      where(condition) {
        this.config.where = condition;
        return this;
      }
      /** @internal */
      build(table) {
        return new Index(this.config, table);
      }
    };
    var Index = class {
      static [import_entity.entityKind] = "PgIndex";
      config;
      constructor(config, table) {
        this.config = { ...config, table };
      }
    };
    function index(name) {
      return new IndexBuilderOn(false, name);
    }
    function uniqueIndex(name) {
      return new IndexBuilderOn(true, name);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/policies.cjs
var require_policies = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/policies.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var policies_exports = {};
    __export(policies_exports, {
      PgPolicy: () => PgPolicy,
      pgPolicy: () => pgPolicy
    });
    module2.exports = __toCommonJS(policies_exports);
    var import_entity = require_entity();
    var PgPolicy = class {
      constructor(name, config) {
        this.name = name;
        if (config) {
          this.as = config.as;
          this.for = config.for;
          this.to = config.to;
          this.using = config.using;
          this.withCheck = config.withCheck;
        }
      }
      static [import_entity.entityKind] = "PgPolicy";
      as;
      for;
      to;
      using;
      withCheck;
      /** @internal */
      _linkedTable;
      link(table) {
        this._linkedTable = table;
        return this;
      }
    };
    function pgPolicy(name, config) {
      return new PgPolicy(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/primary-keys.cjs
var require_primary_keys = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/primary-keys.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var primary_keys_exports = {};
    __export(primary_keys_exports, {
      PrimaryKey: () => PrimaryKey,
      PrimaryKeyBuilder: () => PrimaryKeyBuilder,
      primaryKey: () => primaryKey
    });
    module2.exports = __toCommonJS(primary_keys_exports);
    var import_entity = require_entity();
    var import_table = require_table2();
    function primaryKey(...config) {
      if (config[0].columns) {
        return new PrimaryKeyBuilder(config[0].columns, config[0].name);
      }
      return new PrimaryKeyBuilder(config);
    }
    var PrimaryKeyBuilder = class {
      static [import_entity.entityKind] = "PgPrimaryKeyBuilder";
      /** @internal */
      columns;
      /** @internal */
      name;
      constructor(columns, name) {
        this.columns = columns;
        this.name = name;
      }
      /** @internal */
      build(table) {
        return new PrimaryKey(table, this.columns, this.name);
      }
    };
    var PrimaryKey = class {
      constructor(table, columns, name) {
        this.table = table;
        this.columns = columns;
        this.name = name;
      }
      static [import_entity.entityKind] = "PgPrimaryKey";
      columns;
      name;
      getName() {
        return this.name ?? `${this.table[import_table.PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/view-common.cjs
var require_view_common2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/view-common.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var view_common_exports = {};
    __export(view_common_exports, {
      PgViewConfig: () => PgViewConfig
    });
    module2.exports = __toCommonJS(view_common_exports);
    var PgViewConfig = /* @__PURE__ */ Symbol.for("drizzle:PgViewConfig");
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/casing.cjs
var require_casing = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/casing.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var casing_exports = {};
    __export(casing_exports, {
      CasingCache: () => CasingCache,
      toCamelCase: () => toCamelCase,
      toSnakeCase: () => toSnakeCase
    });
    module2.exports = __toCommonJS(casing_exports);
    var import_entity = require_entity();
    var import_table = require_table();
    function toSnakeCase(input) {
      const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
      return words.map((word) => word.toLowerCase()).join("_");
    }
    function toCamelCase(input) {
      const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
      return words.reduce((acc, word, i) => {
        const formattedWord = i === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
        return acc + formattedWord;
      }, "");
    }
    function noopCase(input) {
      return input;
    }
    var CasingCache = class {
      static [import_entity.entityKind] = "CasingCache";
      /** @internal */
      cache = {};
      cachedTables = {};
      convert;
      constructor(casing) {
        this.convert = casing === "snake_case" ? toSnakeCase : casing === "camelCase" ? toCamelCase : noopCase;
      }
      getColumnCasing(column) {
        if (!column.keyAsName) return column.name;
        const schema = column.table[import_table.Table.Symbol.Schema] ?? "public";
        const tableName = column.table[import_table.Table.Symbol.OriginalName];
        const key = `${schema}.${tableName}.${column.name}`;
        if (!this.cache[key]) {
          this.cacheTable(column.table);
        }
        return this.cache[key];
      }
      cacheTable(table) {
        const schema = table[import_table.Table.Symbol.Schema] ?? "public";
        const tableName = table[import_table.Table.Symbol.OriginalName];
        const tableKey = `${schema}.${tableName}`;
        if (!this.cachedTables[tableKey]) {
          for (const column of Object.values(table[import_table.Table.Symbol.Columns])) {
            const columnKey = `${tableKey}.${column.name}`;
            this.cache[columnKey] = this.convert(column.name);
          }
          this.cachedTables[tableKey] = true;
        }
      }
      clearCache() {
        this.cache = {};
        this.cachedTables = {};
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/errors.cjs
var require_errors = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/errors.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var errors_exports = {};
    __export(errors_exports, {
      DrizzleError: () => DrizzleError,
      DrizzleQueryError: () => DrizzleQueryError,
      TransactionRollbackError: () => TransactionRollbackError
    });
    module2.exports = __toCommonJS(errors_exports);
    var import_entity = require_entity();
    var DrizzleError = class extends Error {
      static [import_entity.entityKind] = "DrizzleError";
      constructor({ message, cause }) {
        super(message);
        this.name = "DrizzleError";
        this.cause = cause;
      }
    };
    var DrizzleQueryError = class _DrizzleQueryError extends Error {
      constructor(query, params, cause) {
        super(`Failed query: ${query}
params: ${params}`);
        this.query = query;
        this.params = params;
        this.cause = cause;
        Error.captureStackTrace(this, _DrizzleQueryError);
        if (cause) this.cause = cause;
      }
    };
    var TransactionRollbackError = class extends DrizzleError {
      static [import_entity.entityKind] = "TransactionRollbackError";
      constructor() {
        super({ message: "Rollback" });
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/expressions/conditions.cjs
var require_conditions = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/expressions/conditions.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var conditions_exports = {};
    __export(conditions_exports, {
      and: () => and,
      arrayContained: () => arrayContained,
      arrayContains: () => arrayContains,
      arrayOverlaps: () => arrayOverlaps,
      between: () => between,
      bindIfParam: () => bindIfParam,
      eq: () => eq,
      exists: () => exists,
      gt: () => gt,
      gte: () => gte,
      ilike: () => ilike,
      inArray: () => inArray,
      isNotNull: () => isNotNull,
      isNull: () => isNull,
      like: () => like,
      lt: () => lt,
      lte: () => lte,
      ne: () => ne,
      not: () => not,
      notBetween: () => notBetween,
      notExists: () => notExists,
      notIlike: () => notIlike,
      notInArray: () => notInArray,
      notLike: () => notLike,
      or: () => or
    });
    module2.exports = __toCommonJS(conditions_exports);
    var import_column = require_column();
    var import_entity = require_entity();
    var import_table = require_table();
    var import_sql = require_sql();
    function bindIfParam(value, column) {
      if ((0, import_sql.isDriverValueEncoder)(column) && !(0, import_sql.isSQLWrapper)(value) && !(0, import_entity.is)(value, import_sql.Param) && !(0, import_entity.is)(value, import_sql.Placeholder) && !(0, import_entity.is)(value, import_column.Column) && !(0, import_entity.is)(value, import_table.Table) && !(0, import_entity.is)(value, import_sql.View)) {
        return new import_sql.Param(value, column);
      }
      return value;
    }
    var eq = (left, right) => {
      return import_sql.sql`${left} = ${bindIfParam(right, left)}`;
    };
    var ne = (left, right) => {
      return import_sql.sql`${left} <> ${bindIfParam(right, left)}`;
    };
    function and(...unfilteredConditions) {
      const conditions = unfilteredConditions.filter(
        (c) => c !== void 0
      );
      if (conditions.length === 0) {
        return void 0;
      }
      if (conditions.length === 1) {
        return new import_sql.SQL(conditions);
      }
      return new import_sql.SQL([
        new import_sql.StringChunk("("),
        import_sql.sql.join(conditions, new import_sql.StringChunk(" and ")),
        new import_sql.StringChunk(")")
      ]);
    }
    function or(...unfilteredConditions) {
      const conditions = unfilteredConditions.filter(
        (c) => c !== void 0
      );
      if (conditions.length === 0) {
        return void 0;
      }
      if (conditions.length === 1) {
        return new import_sql.SQL(conditions);
      }
      return new import_sql.SQL([
        new import_sql.StringChunk("("),
        import_sql.sql.join(conditions, new import_sql.StringChunk(" or ")),
        new import_sql.StringChunk(")")
      ]);
    }
    function not(condition) {
      return import_sql.sql`not ${condition}`;
    }
    var gt = (left, right) => {
      return import_sql.sql`${left} > ${bindIfParam(right, left)}`;
    };
    var gte = (left, right) => {
      return import_sql.sql`${left} >= ${bindIfParam(right, left)}`;
    };
    var lt = (left, right) => {
      return import_sql.sql`${left} < ${bindIfParam(right, left)}`;
    };
    var lte = (left, right) => {
      return import_sql.sql`${left} <= ${bindIfParam(right, left)}`;
    };
    function inArray(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return import_sql.sql`false`;
        }
        return import_sql.sql`${column} in ${values.map((v) => bindIfParam(v, column))}`;
      }
      return import_sql.sql`${column} in ${bindIfParam(values, column)}`;
    }
    function notInArray(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return import_sql.sql`true`;
        }
        return import_sql.sql`${column} not in ${values.map((v) => bindIfParam(v, column))}`;
      }
      return import_sql.sql`${column} not in ${bindIfParam(values, column)}`;
    }
    function isNull(value) {
      return import_sql.sql`${value} is null`;
    }
    function isNotNull(value) {
      return import_sql.sql`${value} is not null`;
    }
    function exists(subquery) {
      return import_sql.sql`exists ${subquery}`;
    }
    function notExists(subquery) {
      return import_sql.sql`not exists ${subquery}`;
    }
    function between(column, min, max) {
      return import_sql.sql`${column} between ${bindIfParam(min, column)} and ${bindIfParam(
        max,
        column
      )}`;
    }
    function notBetween(column, min, max) {
      return import_sql.sql`${column} not between ${bindIfParam(
        min,
        column
      )} and ${bindIfParam(max, column)}`;
    }
    function like(column, value) {
      return import_sql.sql`${column} like ${value}`;
    }
    function notLike(column, value) {
      return import_sql.sql`${column} not like ${value}`;
    }
    function ilike(column, value) {
      return import_sql.sql`${column} ilike ${value}`;
    }
    function notIlike(column, value) {
      return import_sql.sql`${column} not ilike ${value}`;
    }
    function arrayContains(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          throw new Error("arrayContains requires at least one value");
        }
        const array = import_sql.sql`${bindIfParam(values, column)}`;
        return import_sql.sql`${column} @> ${array}`;
      }
      return import_sql.sql`${column} @> ${bindIfParam(values, column)}`;
    }
    function arrayContained(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          throw new Error("arrayContained requires at least one value");
        }
        const array = import_sql.sql`${bindIfParam(values, column)}`;
        return import_sql.sql`${column} <@ ${array}`;
      }
      return import_sql.sql`${column} <@ ${bindIfParam(values, column)}`;
    }
    function arrayOverlaps(column, values) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          throw new Error("arrayOverlaps requires at least one value");
        }
        const array = import_sql.sql`${bindIfParam(values, column)}`;
        return import_sql.sql`${column} && ${array}`;
      }
      return import_sql.sql`${column} && ${bindIfParam(values, column)}`;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/expressions/select.cjs
var require_select = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/expressions/select.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc2) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var select_exports = {};
    __export(select_exports, {
      asc: () => asc,
      desc: () => desc
    });
    module2.exports = __toCommonJS(select_exports);
    var import_sql = require_sql();
    function asc(column) {
      return import_sql.sql`${column} asc`;
    }
    function desc(column) {
      return import_sql.sql`${column} desc`;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/expressions/index.cjs
var require_expressions = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/expressions/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var expressions_exports = {};
    module2.exports = __toCommonJS(expressions_exports);
    __reExport(expressions_exports, require_conditions(), module2.exports);
    __reExport(expressions_exports, require_select(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/relations.cjs
var require_relations = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/relations.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc2) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var relations_exports = {};
    __export(relations_exports, {
      Many: () => Many,
      One: () => One,
      Relation: () => Relation,
      Relations: () => Relations,
      createMany: () => createMany,
      createOne: () => createOne,
      createTableRelationsHelpers: () => createTableRelationsHelpers,
      extractTablesRelationalConfig: () => extractTablesRelationalConfig,
      getOperators: () => getOperators,
      getOrderByOperators: () => getOrderByOperators,
      mapRelationalRow: () => mapRelationalRow,
      normalizeRelation: () => normalizeRelation,
      relations: () => relations
    });
    module2.exports = __toCommonJS(relations_exports);
    var import_table = require_table();
    var import_column = require_column();
    var import_entity = require_entity();
    var import_primary_keys = require_primary_keys();
    var import_expressions = require_expressions();
    var import_sql = require_sql();
    var Relation = class {
      constructor(sourceTable, referencedTable, relationName) {
        this.sourceTable = sourceTable;
        this.referencedTable = referencedTable;
        this.relationName = relationName;
        this.referencedTableName = referencedTable[import_table.Table.Symbol.Name];
      }
      static [import_entity.entityKind] = "Relation";
      referencedTableName;
      fieldName;
    };
    var Relations = class {
      constructor(table, config) {
        this.table = table;
        this.config = config;
      }
      static [import_entity.entityKind] = "Relations";
    };
    var One = class _One extends Relation {
      constructor(sourceTable, referencedTable, config, isNullable) {
        super(sourceTable, referencedTable, config?.relationName);
        this.config = config;
        this.isNullable = isNullable;
      }
      static [import_entity.entityKind] = "One";
      withFieldName(fieldName) {
        const relation = new _One(
          this.sourceTable,
          this.referencedTable,
          this.config,
          this.isNullable
        );
        relation.fieldName = fieldName;
        return relation;
      }
    };
    var Many = class _Many extends Relation {
      constructor(sourceTable, referencedTable, config) {
        super(sourceTable, referencedTable, config?.relationName);
        this.config = config;
      }
      static [import_entity.entityKind] = "Many";
      withFieldName(fieldName) {
        const relation = new _Many(
          this.sourceTable,
          this.referencedTable,
          this.config
        );
        relation.fieldName = fieldName;
        return relation;
      }
    };
    function getOperators() {
      return {
        and: import_expressions.and,
        between: import_expressions.between,
        eq: import_expressions.eq,
        exists: import_expressions.exists,
        gt: import_expressions.gt,
        gte: import_expressions.gte,
        ilike: import_expressions.ilike,
        inArray: import_expressions.inArray,
        isNull: import_expressions.isNull,
        isNotNull: import_expressions.isNotNull,
        like: import_expressions.like,
        lt: import_expressions.lt,
        lte: import_expressions.lte,
        ne: import_expressions.ne,
        not: import_expressions.not,
        notBetween: import_expressions.notBetween,
        notExists: import_expressions.notExists,
        notLike: import_expressions.notLike,
        notIlike: import_expressions.notIlike,
        notInArray: import_expressions.notInArray,
        or: import_expressions.or,
        sql: import_sql.sql
      };
    }
    function getOrderByOperators() {
      return {
        sql: import_sql.sql,
        asc: import_expressions.asc,
        desc: import_expressions.desc
      };
    }
    function extractTablesRelationalConfig(schema, configHelpers) {
      if (Object.keys(schema).length === 1 && "default" in schema && !(0, import_entity.is)(schema["default"], import_table.Table)) {
        schema = schema["default"];
      }
      const tableNamesMap = {};
      const relationsBuffer = {};
      const tablesConfig = {};
      for (const [key, value] of Object.entries(schema)) {
        if ((0, import_entity.is)(value, import_table.Table)) {
          const dbName = (0, import_table.getTableUniqueName)(value);
          const bufferedRelations = relationsBuffer[dbName];
          tableNamesMap[dbName] = key;
          tablesConfig[key] = {
            tsName: key,
            dbName: value[import_table.Table.Symbol.Name],
            schema: value[import_table.Table.Symbol.Schema],
            columns: value[import_table.Table.Symbol.Columns],
            relations: bufferedRelations?.relations ?? {},
            primaryKey: bufferedRelations?.primaryKey ?? []
          };
          for (const column of Object.values(
            value[import_table.Table.Symbol.Columns]
          )) {
            if (column.primary) {
              tablesConfig[key].primaryKey.push(column);
            }
          }
          const extraConfig = value[import_table.Table.Symbol.ExtraConfigBuilder]?.(value[import_table.Table.Symbol.ExtraConfigColumns]);
          if (extraConfig) {
            for (const configEntry of Object.values(extraConfig)) {
              if ((0, import_entity.is)(configEntry, import_primary_keys.PrimaryKeyBuilder)) {
                tablesConfig[key].primaryKey.push(...configEntry.columns);
              }
            }
          }
        } else if ((0, import_entity.is)(value, Relations)) {
          const dbName = (0, import_table.getTableUniqueName)(value.table);
          const tableName = tableNamesMap[dbName];
          const relations2 = value.config(
            configHelpers(value.table)
          );
          let primaryKey;
          for (const [relationName, relation] of Object.entries(relations2)) {
            if (tableName) {
              const tableConfig = tablesConfig[tableName];
              tableConfig.relations[relationName] = relation;
              if (primaryKey) {
                tableConfig.primaryKey.push(...primaryKey);
              }
            } else {
              if (!(dbName in relationsBuffer)) {
                relationsBuffer[dbName] = {
                  relations: {},
                  primaryKey
                };
              }
              relationsBuffer[dbName].relations[relationName] = relation;
            }
          }
        }
      }
      return { tables: tablesConfig, tableNamesMap };
    }
    function relations(table, relations2) {
      return new Relations(
        table,
        (helpers) => Object.fromEntries(
          Object.entries(relations2(helpers)).map(([key, value]) => [
            key,
            value.withFieldName(key)
          ])
        )
      );
    }
    function createOne(sourceTable) {
      return function one(table, config) {
        return new One(
          sourceTable,
          table,
          config,
          config?.fields.reduce((res, f) => res && f.notNull, true) ?? false
        );
      };
    }
    function createMany(sourceTable) {
      return function many(referencedTable, config) {
        return new Many(sourceTable, referencedTable, config);
      };
    }
    function normalizeRelation(schema, tableNamesMap, relation) {
      if ((0, import_entity.is)(relation, One) && relation.config) {
        return {
          fields: relation.config.fields,
          references: relation.config.references
        };
      }
      const referencedTableTsName = tableNamesMap[(0, import_table.getTableUniqueName)(relation.referencedTable)];
      if (!referencedTableTsName) {
        throw new Error(
          `Table "${relation.referencedTable[import_table.Table.Symbol.Name]}" not found in schema`
        );
      }
      const referencedTableConfig = schema[referencedTableTsName];
      if (!referencedTableConfig) {
        throw new Error(`Table "${referencedTableTsName}" not found in schema`);
      }
      const sourceTable = relation.sourceTable;
      const sourceTableTsName = tableNamesMap[(0, import_table.getTableUniqueName)(sourceTable)];
      if (!sourceTableTsName) {
        throw new Error(
          `Table "${sourceTable[import_table.Table.Symbol.Name]}" not found in schema`
        );
      }
      const reverseRelations = [];
      for (const referencedTableRelation of Object.values(
        referencedTableConfig.relations
      )) {
        if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
          reverseRelations.push(referencedTableRelation);
        }
      }
      if (reverseRelations.length > 1) {
        throw relation.relationName ? new Error(
          `There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`
        ) : new Error(
          `There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[import_table.Table.Symbol.Name]}". Please specify relation name`
        );
      }
      if (reverseRelations[0] && (0, import_entity.is)(reverseRelations[0], One) && reverseRelations[0].config) {
        return {
          fields: reverseRelations[0].config.references,
          references: reverseRelations[0].config.fields
        };
      }
      throw new Error(
        `There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`
      );
    }
    function createTableRelationsHelpers(sourceTable) {
      return {
        one: createOne(sourceTable),
        many: createMany(sourceTable)
      };
    }
    function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
      const result = {};
      for (const [
        selectionItemIndex,
        selectionItem
      ] of buildQueryResultSelection.entries()) {
        if (selectionItem.isJson) {
          const relation = tableConfig.relations[selectionItem.tsKey];
          const rawSubRows = row[selectionItemIndex];
          const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
          result[selectionItem.tsKey] = (0, import_entity.is)(relation, One) ? subRows && mapRelationalRow(
            tablesConfig,
            tablesConfig[selectionItem.relationTableTsKey],
            subRows,
            selectionItem.selection,
            mapColumnValue
          ) : subRows.map(
            (subRow) => mapRelationalRow(
              tablesConfig,
              tablesConfig[selectionItem.relationTableTsKey],
              subRow,
              selectionItem.selection,
              mapColumnValue
            )
          );
        } else {
          const value = mapColumnValue(row[selectionItemIndex]);
          const field = selectionItem.field;
          let decoder;
          if ((0, import_entity.is)(field, import_column.Column)) {
            decoder = field;
          } else if ((0, import_entity.is)(field, import_sql.SQL)) {
            decoder = field.decoder;
          } else {
            decoder = field.sql.decoder;
          }
          result[selectionItem.tsKey] = value === null ? null : decoder.mapFromDriverValue(value);
        }
      }
      return result;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/functions/aggregate.cjs
var require_aggregate = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/functions/aggregate.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var aggregate_exports = {};
    __export(aggregate_exports, {
      avg: () => avg,
      avgDistinct: () => avgDistinct,
      count: () => count,
      countDistinct: () => countDistinct,
      max: () => max,
      min: () => min,
      sum: () => sum,
      sumDistinct: () => sumDistinct
    });
    module2.exports = __toCommonJS(aggregate_exports);
    var import_column = require_column();
    var import_entity = require_entity();
    var import_sql = require_sql();
    function count(expression) {
      return import_sql.sql`count(${expression || import_sql.sql.raw("*")})`.mapWith(Number);
    }
    function countDistinct(expression) {
      return import_sql.sql`count(distinct ${expression})`.mapWith(Number);
    }
    function avg(expression) {
      return import_sql.sql`avg(${expression})`.mapWith(String);
    }
    function avgDistinct(expression) {
      return import_sql.sql`avg(distinct ${expression})`.mapWith(String);
    }
    function sum(expression) {
      return import_sql.sql`sum(${expression})`.mapWith(String);
    }
    function sumDistinct(expression) {
      return import_sql.sql`sum(distinct ${expression})`.mapWith(String);
    }
    function max(expression) {
      return import_sql.sql`max(${expression})`.mapWith((0, import_entity.is)(expression, import_column.Column) ? expression : String);
    }
    function min(expression) {
      return import_sql.sql`min(${expression})`.mapWith((0, import_entity.is)(expression, import_column.Column) ? expression : String);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/functions/vector.cjs
var require_vector2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/functions/vector.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var vector_exports = {};
    __export(vector_exports, {
      cosineDistance: () => cosineDistance,
      hammingDistance: () => hammingDistance,
      innerProduct: () => innerProduct,
      jaccardDistance: () => jaccardDistance,
      l1Distance: () => l1Distance,
      l2Distance: () => l2Distance
    });
    module2.exports = __toCommonJS(vector_exports);
    var import_sql = require_sql();
    function toSql(value) {
      return JSON.stringify(value);
    }
    function l2Distance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <-> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <-> ${value}`;
    }
    function l1Distance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <+> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <+> ${value}`;
    }
    function innerProduct(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <#> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <#> ${value}`;
    }
    function cosineDistance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <=> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <=> ${value}`;
    }
    function hammingDistance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <~> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <~> ${value}`;
    }
    function jaccardDistance(column, value) {
      if (Array.isArray(value)) {
        return import_sql.sql`${column} <%> ${toSql(value)}`;
      }
      return import_sql.sql`${column} <%> ${value}`;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/functions/index.cjs
var require_functions = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/functions/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var functions_exports = {};
    module2.exports = __toCommonJS(functions_exports);
    __reExport(functions_exports, require_aggregate(), module2.exports);
    __reExport(functions_exports, require_vector2(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/index.cjs
var require_sql2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/sql/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var sql_exports = {};
    module2.exports = __toCommonJS(sql_exports);
    __reExport(sql_exports, require_expressions(), module2.exports);
    __reExport(sql_exports, require_functions(), module2.exports);
    __reExport(sql_exports, require_sql(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/view-base.cjs
var require_view_base = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/view-base.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var view_base_exports = {};
    __export(view_base_exports, {
      PgViewBase: () => PgViewBase
    });
    module2.exports = __toCommonJS(view_base_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var PgViewBase = class extends import_sql.View {
      static [import_entity.entityKind] = "PgViewBase";
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/dialect.cjs
var require_dialect = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/dialect.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var dialect_exports = {};
    __export(dialect_exports, {
      PgDialect: () => PgDialect
    });
    module2.exports = __toCommonJS(dialect_exports);
    var import_alias = require_alias();
    var import_casing = require_casing();
    var import_column = require_column();
    var import_entity = require_entity();
    var import_errors = require_errors();
    var import_columns = require_columns();
    var import_table = require_table2();
    var import_relations = require_relations();
    var import_sql = require_sql2();
    var import_sql2 = require_sql();
    var import_subquery = require_subquery();
    var import_table2 = require_table();
    var import_utils = require_utils3();
    var import_view_common = require_view_common();
    var import_view_base = require_view_base();
    var PgDialect = class {
      static [import_entity.entityKind] = "PgDialect";
      /** @internal */
      casing;
      constructor(config) {
        this.casing = new import_casing.CasingCache(config?.casing);
      }
      async migrate(migrations, session, config) {
        const migrationsTable = typeof config === "string" ? "__drizzle_migrations" : config.migrationsTable ?? "__drizzle_migrations";
        const migrationsSchema = typeof config === "string" ? "drizzle" : config.migrationsSchema ?? "drizzle";
        const migrationTableCreate = import_sql2.sql`
			CREATE TABLE IF NOT EXISTS ${import_sql2.sql.identifier(migrationsSchema)}.${import_sql2.sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`;
        await session.execute(import_sql2.sql`CREATE SCHEMA IF NOT EXISTS ${import_sql2.sql.identifier(migrationsSchema)}`);
        await session.execute(migrationTableCreate);
        const dbMigrations = await session.all(
          import_sql2.sql`select id, hash, created_at from ${import_sql2.sql.identifier(migrationsSchema)}.${import_sql2.sql.identifier(migrationsTable)} order by created_at desc limit 1`
        );
        const lastDbMigration = dbMigrations[0];
        await session.transaction(async (tx) => {
          for await (const migration of migrations) {
            if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
              for (const stmt of migration.sql) {
                await tx.execute(import_sql2.sql.raw(stmt));
              }
              await tx.execute(
                import_sql2.sql`insert into ${import_sql2.sql.identifier(migrationsSchema)}.${import_sql2.sql.identifier(migrationsTable)} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`
              );
            }
          }
        });
      }
      escapeName(name) {
        return `"${name.replace(/"/g, '""')}"`;
      }
      escapeParam(num) {
        return `$${num + 1}`;
      }
      escapeString(str) {
        return `'${str.replace(/'/g, "''")}'`;
      }
      buildWithCTE(queries) {
        if (!queries?.length) return void 0;
        const withSqlChunks = [import_sql2.sql`with `];
        for (const [i, w] of queries.entries()) {
          withSqlChunks.push(import_sql2.sql`${import_sql2.sql.identifier(w._.alias)} as (${w._.sql})`);
          if (i < queries.length - 1) {
            withSqlChunks.push(import_sql2.sql`, `);
          }
        }
        withSqlChunks.push(import_sql2.sql` `);
        return import_sql2.sql.join(withSqlChunks);
      }
      buildDeleteQuery({ table, where, returning, withList }) {
        const withSql = this.buildWithCTE(withList);
        const returningSql = returning ? import_sql2.sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const whereSql = where ? import_sql2.sql` where ${where}` : void 0;
        return import_sql2.sql`${withSql}delete from ${table}${whereSql}${returningSql}`;
      }
      buildUpdateSet(table, set) {
        const tableColumns = table[import_table2.Table.Symbol.Columns];
        const columnNames = Object.keys(tableColumns).filter(
          (colName) => set[colName] !== void 0 || tableColumns[colName]?.onUpdateFn !== void 0
        );
        const setSize = columnNames.length;
        return import_sql2.sql.join(columnNames.flatMap((colName, i) => {
          const col = tableColumns[colName];
          const onUpdateFnResult = col.onUpdateFn?.();
          const value = set[colName] ?? ((0, import_entity.is)(onUpdateFnResult, import_sql2.SQL) ? onUpdateFnResult : import_sql2.sql.param(onUpdateFnResult, col));
          const res = import_sql2.sql`${import_sql2.sql.identifier(this.casing.getColumnCasing(col))} = ${value}`;
          if (i < setSize - 1) {
            return [res, import_sql2.sql.raw(", ")];
          }
          return [res];
        }));
      }
      buildUpdateQuery({ table, set, where, returning, withList, from, joins }) {
        const withSql = this.buildWithCTE(withList);
        const tableName = table[import_table.PgTable.Symbol.Name];
        const tableSchema = table[import_table.PgTable.Symbol.Schema];
        const origTableName = table[import_table.PgTable.Symbol.OriginalName];
        const alias = tableName === origTableName ? void 0 : tableName;
        const tableSql = import_sql2.sql`${tableSchema ? import_sql2.sql`${import_sql2.sql.identifier(tableSchema)}.` : void 0}${import_sql2.sql.identifier(origTableName)}${alias && import_sql2.sql` ${import_sql2.sql.identifier(alias)}`}`;
        const setSql = this.buildUpdateSet(table, set);
        const fromSql = from && import_sql2.sql.join([import_sql2.sql.raw(" from "), this.buildFromTable(from)]);
        const joinsSql = this.buildJoins(joins);
        const returningSql = returning ? import_sql2.sql` returning ${this.buildSelection(returning, { isSingleTable: !from })}` : void 0;
        const whereSql = where ? import_sql2.sql` where ${where}` : void 0;
        return import_sql2.sql`${withSql}update ${tableSql} set ${setSql}${fromSql}${joinsSql}${whereSql}${returningSql}`;
      }
      /**
       * Builds selection SQL with provided fields/expressions
       *
       * Examples:
       *
       * `select <selection> from`
       *
       * `insert ... returning <selection>`
       *
       * If `isSingleTable` is true, then columns won't be prefixed with table name
       */
      buildSelection(fields, { isSingleTable = false } = {}) {
        const columnsLen = fields.length;
        const chunks = fields.flatMap(({ field }, i) => {
          const chunk = [];
          if ((0, import_entity.is)(field, import_sql2.SQL.Aliased) && field.isSelectionField) {
            chunk.push(import_sql2.sql.identifier(field.fieldAlias));
          } else if ((0, import_entity.is)(field, import_sql2.SQL.Aliased) || (0, import_entity.is)(field, import_sql2.SQL)) {
            const query = (0, import_entity.is)(field, import_sql2.SQL.Aliased) ? field.sql : field;
            if (isSingleTable) {
              chunk.push(
                new import_sql2.SQL(
                  query.queryChunks.map((c) => {
                    if ((0, import_entity.is)(c, import_columns.PgColumn)) {
                      return import_sql2.sql.identifier(this.casing.getColumnCasing(c));
                    }
                    return c;
                  })
                )
              );
            } else {
              chunk.push(query);
            }
            if ((0, import_entity.is)(field, import_sql2.SQL.Aliased)) {
              chunk.push(import_sql2.sql` as ${import_sql2.sql.identifier(field.fieldAlias)}`);
            }
          } else if ((0, import_entity.is)(field, import_column.Column)) {
            if (isSingleTable) {
              chunk.push(import_sql2.sql.identifier(this.casing.getColumnCasing(field)));
            } else {
              chunk.push(field);
            }
          } else if ((0, import_entity.is)(field, import_subquery.Subquery)) {
            const entries = Object.entries(field._.selectedFields);
            if (entries.length === 1) {
              const entry = entries[0][1];
              const fieldDecoder = (0, import_entity.is)(entry, import_sql2.SQL) ? entry.decoder : (0, import_entity.is)(entry, import_column.Column) ? { mapFromDriverValue: (v) => entry.mapFromDriverValue(v) } : entry.sql.decoder;
              if (fieldDecoder) {
                field._.sql.decoder = fieldDecoder;
              }
            }
            chunk.push(field);
          }
          if (i < columnsLen - 1) {
            chunk.push(import_sql2.sql`, `);
          }
          return chunk;
        });
        return import_sql2.sql.join(chunks);
      }
      buildJoins(joins) {
        if (!joins || joins.length === 0) {
          return void 0;
        }
        const joinsArray = [];
        for (const [index, joinMeta] of joins.entries()) {
          if (index === 0) {
            joinsArray.push(import_sql2.sql` `);
          }
          const table = joinMeta.table;
          const lateralSql = joinMeta.lateral ? import_sql2.sql` lateral` : void 0;
          const onSql = joinMeta.on ? import_sql2.sql` on ${joinMeta.on}` : void 0;
          if ((0, import_entity.is)(table, import_table.PgTable)) {
            const tableName = table[import_table.PgTable.Symbol.Name];
            const tableSchema = table[import_table.PgTable.Symbol.Schema];
            const origTableName = table[import_table.PgTable.Symbol.OriginalName];
            const alias = tableName === origTableName ? void 0 : joinMeta.alias;
            joinsArray.push(
              import_sql2.sql`${import_sql2.sql.raw(joinMeta.joinType)} join${lateralSql} ${tableSchema ? import_sql2.sql`${import_sql2.sql.identifier(tableSchema)}.` : void 0}${import_sql2.sql.identifier(origTableName)}${alias && import_sql2.sql` ${import_sql2.sql.identifier(alias)}`}${onSql}`
            );
          } else if ((0, import_entity.is)(table, import_sql.View)) {
            const viewName = table[import_view_common.ViewBaseConfig].name;
            const viewSchema = table[import_view_common.ViewBaseConfig].schema;
            const origViewName = table[import_view_common.ViewBaseConfig].originalName;
            const alias = viewName === origViewName ? void 0 : joinMeta.alias;
            joinsArray.push(
              import_sql2.sql`${import_sql2.sql.raw(joinMeta.joinType)} join${lateralSql} ${viewSchema ? import_sql2.sql`${import_sql2.sql.identifier(viewSchema)}.` : void 0}${import_sql2.sql.identifier(origViewName)}${alias && import_sql2.sql` ${import_sql2.sql.identifier(alias)}`}${onSql}`
            );
          } else {
            joinsArray.push(
              import_sql2.sql`${import_sql2.sql.raw(joinMeta.joinType)} join${lateralSql} ${table}${onSql}`
            );
          }
          if (index < joins.length - 1) {
            joinsArray.push(import_sql2.sql` `);
          }
        }
        return import_sql2.sql.join(joinsArray);
      }
      buildFromTable(table) {
        if ((0, import_entity.is)(table, import_table2.Table) && table[import_table2.Table.Symbol.IsAlias]) {
          let fullName = import_sql2.sql`${import_sql2.sql.identifier(table[import_table2.Table.Symbol.OriginalName])}`;
          if (table[import_table2.Table.Symbol.Schema]) {
            fullName = import_sql2.sql`${import_sql2.sql.identifier(table[import_table2.Table.Symbol.Schema])}.${fullName}`;
          }
          return import_sql2.sql`${fullName} ${import_sql2.sql.identifier(table[import_table2.Table.Symbol.Name])}`;
        }
        return table;
      }
      buildSelectQuery({
        withList,
        fields,
        fieldsFlat,
        where,
        having,
        table,
        joins,
        orderBy,
        groupBy,
        limit,
        offset,
        lockingClause,
        distinct,
        setOperators
      }) {
        const fieldsList = fieldsFlat ?? (0, import_utils.orderSelectedFields)(fields);
        for (const f of fieldsList) {
          if ((0, import_entity.is)(f.field, import_column.Column) && (0, import_table2.getTableName)(f.field.table) !== ((0, import_entity.is)(table, import_subquery.Subquery) ? table._.alias : (0, import_entity.is)(table, import_view_base.PgViewBase) ? table[import_view_common.ViewBaseConfig].name : (0, import_entity.is)(table, import_sql2.SQL) ? void 0 : (0, import_table2.getTableName)(table)) && !((table2) => joins?.some(
            ({ alias }) => alias === (table2[import_table2.Table.Symbol.IsAlias] ? (0, import_table2.getTableName)(table2) : table2[import_table2.Table.Symbol.BaseName])
          ))(f.field.table)) {
            const tableName = (0, import_table2.getTableName)(f.field.table);
            throw new Error(
              `Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`
            );
          }
        }
        const isSingleTable = !joins || joins.length === 0;
        const withSql = this.buildWithCTE(withList);
        let distinctSql;
        if (distinct) {
          distinctSql = distinct === true ? import_sql2.sql` distinct` : import_sql2.sql` distinct on (${import_sql2.sql.join(distinct.on, import_sql2.sql`, `)})`;
        }
        const selection = this.buildSelection(fieldsList, { isSingleTable });
        const tableSql = this.buildFromTable(table);
        const joinsSql = this.buildJoins(joins);
        const whereSql = where ? import_sql2.sql` where ${where}` : void 0;
        const havingSql = having ? import_sql2.sql` having ${having}` : void 0;
        let orderBySql;
        if (orderBy && orderBy.length > 0) {
          orderBySql = import_sql2.sql` order by ${import_sql2.sql.join(orderBy, import_sql2.sql`, `)}`;
        }
        let groupBySql;
        if (groupBy && groupBy.length > 0) {
          groupBySql = import_sql2.sql` group by ${import_sql2.sql.join(groupBy, import_sql2.sql`, `)}`;
        }
        const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? import_sql2.sql` limit ${limit}` : void 0;
        const offsetSql = offset ? import_sql2.sql` offset ${offset}` : void 0;
        const lockingClauseSql = import_sql2.sql.empty();
        if (lockingClause) {
          const clauseSql = import_sql2.sql` for ${import_sql2.sql.raw(lockingClause.strength)}`;
          if (lockingClause.config.of) {
            clauseSql.append(
              import_sql2.sql` of ${import_sql2.sql.join(
                Array.isArray(lockingClause.config.of) ? lockingClause.config.of : [lockingClause.config.of],
                import_sql2.sql`, `
              )}`
            );
          }
          if (lockingClause.config.noWait) {
            clauseSql.append(import_sql2.sql` nowait`);
          } else if (lockingClause.config.skipLocked) {
            clauseSql.append(import_sql2.sql` skip locked`);
          }
          lockingClauseSql.append(clauseSql);
        }
        const finalQuery = import_sql2.sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}${lockingClauseSql}`;
        if (setOperators.length > 0) {
          return this.buildSetOperations(finalQuery, setOperators);
        }
        return finalQuery;
      }
      buildSetOperations(leftSelect, setOperators) {
        const [setOperator, ...rest] = setOperators;
        if (!setOperator) {
          throw new Error("Cannot pass undefined values to any set operator");
        }
        if (rest.length === 0) {
          return this.buildSetOperationQuery({ leftSelect, setOperator });
        }
        return this.buildSetOperations(
          this.buildSetOperationQuery({ leftSelect, setOperator }),
          rest
        );
      }
      buildSetOperationQuery({
        leftSelect,
        setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
      }) {
        const leftChunk = import_sql2.sql`(${leftSelect.getSQL()}) `;
        const rightChunk = import_sql2.sql`(${rightSelect.getSQL()})`;
        let orderBySql;
        if (orderBy && orderBy.length > 0) {
          const orderByValues = [];
          for (const singleOrderBy of orderBy) {
            if ((0, import_entity.is)(singleOrderBy, import_columns.PgColumn)) {
              orderByValues.push(import_sql2.sql.identifier(singleOrderBy.name));
            } else if ((0, import_entity.is)(singleOrderBy, import_sql2.SQL)) {
              for (let i = 0; i < singleOrderBy.queryChunks.length; i++) {
                const chunk = singleOrderBy.queryChunks[i];
                if ((0, import_entity.is)(chunk, import_columns.PgColumn)) {
                  singleOrderBy.queryChunks[i] = import_sql2.sql.identifier(chunk.name);
                }
              }
              orderByValues.push(import_sql2.sql`${singleOrderBy}`);
            } else {
              orderByValues.push(import_sql2.sql`${singleOrderBy}`);
            }
          }
          orderBySql = import_sql2.sql` order by ${import_sql2.sql.join(orderByValues, import_sql2.sql`, `)} `;
        }
        const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? import_sql2.sql` limit ${limit}` : void 0;
        const operatorChunk = import_sql2.sql.raw(`${type} ${isAll ? "all " : ""}`);
        const offsetSql = offset ? import_sql2.sql` offset ${offset}` : void 0;
        return import_sql2.sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
      }
      buildInsertQuery({ table, values: valuesOrSelect, onConflict, returning, withList, select, overridingSystemValue_ }) {
        const valuesSqlList = [];
        const columns = table[import_table2.Table.Symbol.Columns];
        const colEntries = Object.entries(columns).filter(([_, col]) => !col.shouldDisableInsert());
        const insertOrder = colEntries.map(
          ([, column]) => import_sql2.sql.identifier(this.casing.getColumnCasing(column))
        );
        if (select) {
          const select2 = valuesOrSelect;
          if ((0, import_entity.is)(select2, import_sql2.SQL)) {
            valuesSqlList.push(select2);
          } else {
            valuesSqlList.push(select2.getSQL());
          }
        } else {
          const values = valuesOrSelect;
          valuesSqlList.push(import_sql2.sql.raw("values "));
          for (const [valueIndex, value] of values.entries()) {
            const valueList = [];
            for (const [fieldName, col] of colEntries) {
              const colValue = value[fieldName];
              if (colValue === void 0 || (0, import_entity.is)(colValue, import_sql2.Param) && colValue.value === void 0) {
                if (col.defaultFn !== void 0) {
                  const defaultFnResult = col.defaultFn();
                  const defaultValue = (0, import_entity.is)(defaultFnResult, import_sql2.SQL) ? defaultFnResult : import_sql2.sql.param(defaultFnResult, col);
                  valueList.push(defaultValue);
                } else if (!col.default && col.onUpdateFn !== void 0) {
                  const onUpdateFnResult = col.onUpdateFn();
                  const newValue = (0, import_entity.is)(onUpdateFnResult, import_sql2.SQL) ? onUpdateFnResult : import_sql2.sql.param(onUpdateFnResult, col);
                  valueList.push(newValue);
                } else {
                  valueList.push(import_sql2.sql`default`);
                }
              } else {
                valueList.push(colValue);
              }
            }
            valuesSqlList.push(valueList);
            if (valueIndex < values.length - 1) {
              valuesSqlList.push(import_sql2.sql`, `);
            }
          }
        }
        const withSql = this.buildWithCTE(withList);
        const valuesSql = import_sql2.sql.join(valuesSqlList);
        const returningSql = returning ? import_sql2.sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const onConflictSql = onConflict ? import_sql2.sql` on conflict ${onConflict}` : void 0;
        const overridingSql = overridingSystemValue_ === true ? import_sql2.sql`overriding system value ` : void 0;
        return import_sql2.sql`${withSql}insert into ${table} ${insertOrder} ${overridingSql}${valuesSql}${onConflictSql}${returningSql}`;
      }
      buildRefreshMaterializedViewQuery({ view, concurrently, withNoData }) {
        const concurrentlySql = concurrently ? import_sql2.sql` concurrently` : void 0;
        const withNoDataSql = withNoData ? import_sql2.sql` with no data` : void 0;
        return import_sql2.sql`refresh materialized view${concurrentlySql} ${view}${withNoDataSql}`;
      }
      prepareTyping(encoder) {
        if ((0, import_entity.is)(encoder, import_columns.PgJsonb) || (0, import_entity.is)(encoder, import_columns.PgJson)) {
          return "json";
        } else if ((0, import_entity.is)(encoder, import_columns.PgNumeric)) {
          return "decimal";
        } else if ((0, import_entity.is)(encoder, import_columns.PgTime)) {
          return "time";
        } else if ((0, import_entity.is)(encoder, import_columns.PgTimestamp) || (0, import_entity.is)(encoder, import_columns.PgTimestampString)) {
          return "timestamp";
        } else if ((0, import_entity.is)(encoder, import_columns.PgDate) || (0, import_entity.is)(encoder, import_columns.PgDateString)) {
          return "date";
        } else if ((0, import_entity.is)(encoder, import_columns.PgUUID)) {
          return "uuid";
        } else {
          return "none";
        }
      }
      sqlToQuery(sql2, invokeSource) {
        return sql2.toQuery({
          casing: this.casing,
          escapeName: this.escapeName,
          escapeParam: this.escapeParam,
          escapeString: this.escapeString,
          prepareTyping: this.prepareTyping,
          invokeSource
        });
      }
      // buildRelationalQueryWithPK({
      // 	fullSchema,
      // 	schema,
      // 	tableNamesMap,
      // 	table,
      // 	tableConfig,
      // 	queryConfig: config,
      // 	tableAlias,
      // 	isRoot = false,
      // 	joinOn,
      // }: {
      // 	fullSchema: Record<string, unknown>;
      // 	schema: TablesRelationalConfig;
      // 	tableNamesMap: Record<string, string>;
      // 	table: PgTable;
      // 	tableConfig: TableRelationalConfig;
      // 	queryConfig: true | DBQueryConfig<'many', true>;
      // 	tableAlias: string;
      // 	isRoot?: boolean;
      // 	joinOn?: SQL;
      // }): BuildRelationalQueryResult<PgTable, PgColumn> {
      // 	// For { "<relation>": true }, return a table with selection of all columns
      // 	if (config === true) {
      // 		const selectionEntries = Object.entries(tableConfig.columns);
      // 		const selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = selectionEntries.map((
      // 			[key, value],
      // 		) => ({
      // 			dbKey: value.name,
      // 			tsKey: key,
      // 			field: value as PgColumn,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 		return {
      // 			tableTsKey: tableConfig.tsName,
      // 			sql: table,
      // 			selection,
      // 		};
      // 	}
      // 	// let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
      // 	// let selectionForBuild = selection;
      // 	const aliasedColumns = Object.fromEntries(
      // 		Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)]),
      // 	);
      // 	const aliasedRelations = Object.fromEntries(
      // 		Object.entries(tableConfig.relations).map(([key, value]) => [key, aliasedRelation(value, tableAlias)]),
      // 	);
      // 	const aliasedFields = Object.assign({}, aliasedColumns, aliasedRelations);
      // 	let where, hasUserDefinedWhere;
      // 	if (config.where) {
      // 		const whereSql = typeof config.where === 'function' ? config.where(aliasedFields, operators) : config.where;
      // 		where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
      // 		hasUserDefinedWhere = !!where;
      // 	}
      // 	where = and(joinOn, where);
      // 	// const fieldsSelection: { tsKey: string; value: PgColumn | SQL.Aliased; isExtra?: boolean }[] = [];
      // 	let joins: Join[] = [];
      // 	let selectedColumns: string[] = [];
      // 	// Figure out which columns to select
      // 	if (config.columns) {
      // 		let isIncludeMode = false;
      // 		for (const [field, value] of Object.entries(config.columns)) {
      // 			if (value === undefined) {
      // 				continue;
      // 			}
      // 			if (field in tableConfig.columns) {
      // 				if (!isIncludeMode && value === true) {
      // 					isIncludeMode = true;
      // 				}
      // 				selectedColumns.push(field);
      // 			}
      // 		}
      // 		if (selectedColumns.length > 0) {
      // 			selectedColumns = isIncludeMode
      // 				? selectedColumns.filter((c) => config.columns?.[c] === true)
      // 				: Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
      // 		}
      // 	} else {
      // 		// Select all columns if selection is not specified
      // 		selectedColumns = Object.keys(tableConfig.columns);
      // 	}
      // 	// for (const field of selectedColumns) {
      // 	// 	const column = tableConfig.columns[field]! as PgColumn;
      // 	// 	fieldsSelection.push({ tsKey: field, value: column });
      // 	// }
      // 	let initiallySelectedRelations: {
      // 		tsKey: string;
      // 		queryConfig: true | DBQueryConfig<'many', false>;
      // 		relation: Relation;
      // 	}[] = [];
      // 	// let selectedRelations: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
      // 	// Figure out which relations to select
      // 	if (config.with) {
      // 		initiallySelectedRelations = Object.entries(config.with)
      // 			.filter((entry): entry is [typeof entry[0], NonNullable<typeof entry[1]>] => !!entry[1])
      // 			.map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey]! }));
      // 	}
      // 	const manyRelations = initiallySelectedRelations.filter((r) =>
      // 		is(r.relation, Many)
      // 		&& (schema[tableNamesMap[r.relation.referencedTable[Table.Symbol.Name]]!]?.primaryKey.length ?? 0) > 0
      // 	);
      // 	// If this is the last Many relation (or there are no Many relations), we are on the innermost subquery level
      // 	const isInnermostQuery = manyRelations.length < 2;
      // 	const selectedExtras: {
      // 		tsKey: string;
      // 		value: SQL.Aliased;
      // 	}[] = [];
      // 	// Figure out which extras to select
      // 	if (isInnermostQuery && config.extras) {
      // 		const extras = typeof config.extras === 'function'
      // 			? config.extras(aliasedFields, { sql })
      // 			: config.extras;
      // 		for (const [tsKey, value] of Object.entries(extras)) {
      // 			selectedExtras.push({
      // 				tsKey,
      // 				value: mapColumnsInAliasedSQLToAlias(value, tableAlias),
      // 			});
      // 		}
      // 	}
      // 	// Transform `fieldsSelection` into `selection`
      // 	// `fieldsSelection` shouldn't be used after this point
      // 	// for (const { tsKey, value, isExtra } of fieldsSelection) {
      // 	// 	selection.push({
      // 	// 		dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey]!.name,
      // 	// 		tsKey,
      // 	// 		field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
      // 	// 		relationTableTsKey: undefined,
      // 	// 		isJson: false,
      // 	// 		isExtra,
      // 	// 		selection: [],
      // 	// 	});
      // 	// }
      // 	let orderByOrig = typeof config.orderBy === 'function'
      // 		? config.orderBy(aliasedFields, orderByOperators)
      // 		: config.orderBy ?? [];
      // 	if (!Array.isArray(orderByOrig)) {
      // 		orderByOrig = [orderByOrig];
      // 	}
      // 	const orderBy = orderByOrig.map((orderByValue) => {
      // 		if (is(orderByValue, Column)) {
      // 			return aliasedTableColumn(orderByValue, tableAlias) as PgColumn;
      // 		}
      // 		return mapColumnsInSQLToAlias(orderByValue, tableAlias);
      // 	});
      // 	const limit = isInnermostQuery ? config.limit : undefined;
      // 	const offset = isInnermostQuery ? config.offset : undefined;
      // 	// For non-root queries without additional config except columns, return a table with selection
      // 	if (
      // 		!isRoot
      // 		&& initiallySelectedRelations.length === 0
      // 		&& selectedExtras.length === 0
      // 		&& !where
      // 		&& orderBy.length === 0
      // 		&& limit === undefined
      // 		&& offset === undefined
      // 	) {
      // 		return {
      // 			tableTsKey: tableConfig.tsName,
      // 			sql: table,
      // 			selection: selectedColumns.map((key) => ({
      // 				dbKey: tableConfig.columns[key]!.name,
      // 				tsKey: key,
      // 				field: tableConfig.columns[key] as PgColumn,
      // 				relationTableTsKey: undefined,
      // 				isJson: false,
      // 				selection: [],
      // 			})),
      // 		};
      // 	}
      // 	const selectedRelationsWithoutPK:
      // 	// Process all relations without primary keys, because they need to be joined differently and will all be on the same query level
      // 	for (
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationConfigValue,
      // 			relation,
      // 		} of initiallySelectedRelations
      // 	) {
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTable = schema[relationTableTsName]!;
      // 		if (relationTable.primaryKey.length > 0) {
      // 			continue;
      // 		}
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelation = this.buildRelationalQueryWithoutPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationConfigValue,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 			nestedQueryRelation: relation,
      // 		});
      // 		const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier('data')}`.as(selectedRelationTsKey);
      // 		joins.push({
      // 			on: sql`true`,
      // 			table: new Subquery(builtRelation.sql as SQL, {}, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: true,
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelation.selection,
      // 		});
      // 	}
      // 	const oneRelations = initiallySelectedRelations.filter((r): r is typeof r & { relation: One } =>
      // 		is(r.relation, One)
      // 	);
      // 	// Process all One relations with PKs, because they can all be joined on the same level
      // 	for (
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationConfigValue,
      // 			relation,
      // 		} of oneRelations
      // 	) {
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const relationTable = schema[relationTableTsName]!;
      // 		if (relationTable.primaryKey.length === 0) {
      // 			continue;
      // 		}
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelation = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationConfigValue,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 		});
      // 		const field = sql`case when ${sql.identifier(relationTableAlias)} is null then null else json_build_array(${
      // 			sql.join(
      // 				builtRelation.selection.map(({ field }) =>
      // 					is(field, SQL.Aliased)
      // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
      // 						: is(field, Column)
      // 						? aliasedTableColumn(field, relationTableAlias)
      // 						: field
      // 				),
      // 				sql`, `,
      // 			)
      // 		}) end`.as(selectedRelationTsKey);
      // 		const isLateralJoin = is(builtRelation.sql, SQL);
      // 		joins.push({
      // 			on: isLateralJoin ? sql`true` : joinOn,
      // 			table: is(builtRelation.sql, SQL)
      // 				? new Subquery(builtRelation.sql, {}, relationTableAlias)
      // 				: aliasedTable(builtRelation.sql, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: is(builtRelation.sql, SQL),
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelation.selection,
      // 		});
      // 	}
      // 	let distinct: PgSelectConfig['distinct'];
      // 	let tableFrom: PgTable | Subquery = table;
      // 	// Process first Many relation - each one requires a nested subquery
      // 	const manyRelation = manyRelations[0];
      // 	if (manyRelation) {
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationQueryConfig,
      // 			relation,
      // 		} = manyRelation;
      // 		distinct = {
      // 			on: tableConfig.primaryKey.map((c) => aliasedTableColumn(c as PgColumn, tableAlias)),
      // 		};
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelationJoin = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationQueryConfig,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 		});
      // 		const builtRelationSelectionField = sql`case when ${
      // 			sql.identifier(relationTableAlias)
      // 		} is null then '[]' else json_agg(json_build_array(${
      // 			sql.join(
      // 				builtRelationJoin.selection.map(({ field }) =>
      // 					is(field, SQL.Aliased)
      // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
      // 						: is(field, Column)
      // 						? aliasedTableColumn(field, relationTableAlias)
      // 						: field
      // 				),
      // 				sql`, `,
      // 			)
      // 		})) over (partition by ${sql.join(distinct.on, sql`, `)}) end`.as(selectedRelationTsKey);
      // 		const isLateralJoin = is(builtRelationJoin.sql, SQL);
      // 		joins.push({
      // 			on: isLateralJoin ? sql`true` : joinOn,
      // 			table: isLateralJoin
      // 				? new Subquery(builtRelationJoin.sql as SQL, {}, relationTableAlias)
      // 				: aliasedTable(builtRelationJoin.sql as PgTable, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: isLateralJoin,
      // 		});
      // 		// Build the "from" subquery with the remaining Many relations
      // 		const builtTableFrom = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table,
      // 			tableConfig,
      // 			queryConfig: {
      // 				...config,
      // 				where: undefined,
      // 				orderBy: undefined,
      // 				limit: undefined,
      // 				offset: undefined,
      // 				with: manyRelations.slice(1).reduce<NonNullable<typeof config['with']>>(
      // 					(result, { tsKey, queryConfig: configValue }) => {
      // 						result[tsKey] = configValue;
      // 						return result;
      // 					},
      // 					{},
      // 				),
      // 			},
      // 			tableAlias,
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field: builtRelationSelectionField,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelationJoin.selection,
      // 		});
      // 		// selection = builtTableFrom.selection.map((item) =>
      // 		// 	is(item.field, SQL.Aliased)
      // 		// 		? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
      // 		// 		: item
      // 		// );
      // 		// selectionForBuild = [{
      // 		// 	dbKey: '*',
      // 		// 	tsKey: '*',
      // 		// 	field: sql`${sql.identifier(tableAlias)}.*`,
      // 		// 	selection: [],
      // 		// 	isJson: false,
      // 		// 	relationTableTsKey: undefined,
      // 		// }];
      // 		// const newSelectionItem: (typeof selection)[number] = {
      // 		// 	dbKey: selectedRelationTsKey,
      // 		// 	tsKey: selectedRelationTsKey,
      // 		// 	field,
      // 		// 	relationTableTsKey: relationTableTsName,
      // 		// 	isJson: true,
      // 		// 	selection: builtRelationJoin.selection,
      // 		// };
      // 		// selection.push(newSelectionItem);
      // 		// selectionForBuild.push(newSelectionItem);
      // 		tableFrom = is(builtTableFrom.sql, PgTable)
      // 			? builtTableFrom.sql
      // 			: new Subquery(builtTableFrom.sql, {}, tableAlias);
      // 	}
      // 	if (selectedColumns.length === 0 && selectedRelations.length === 0 && selectedExtras.length === 0) {
      // 		throw new DrizzleError(`No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")`);
      // 	}
      // 	let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'];
      // 	function prepareSelectedColumns() {
      // 		return selectedColumns.map((key) => ({
      // 			dbKey: tableConfig.columns[key]!.name,
      // 			tsKey: key,
      // 			field: tableConfig.columns[key] as PgColumn,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 	}
      // 	function prepareSelectedExtras() {
      // 		return selectedExtras.map((item) => ({
      // 			dbKey: item.value.fieldAlias,
      // 			tsKey: item.tsKey,
      // 			field: item.value,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 	}
      // 	if (isRoot) {
      // 		selection = [
      // 			...prepareSelectedColumns(),
      // 			...prepareSelectedExtras(),
      // 		];
      // 	}
      // 	if (hasUserDefinedWhere || orderBy.length > 0) {
      // 		tableFrom = new Subquery(
      // 			this.buildSelectQuery({
      // 				table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
      // 				fields: {},
      // 				fieldsFlat: selectionForBuild.map(({ field }) => ({
      // 					path: [],
      // 					field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
      // 				})),
      // 				joins,
      // 				distinct,
      // 			}),
      // 			{},
      // 			tableAlias,
      // 		);
      // 		selectionForBuild = selection.map((item) =>
      // 			is(item.field, SQL.Aliased)
      // 				? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
      // 				: item
      // 		);
      // 		joins = [];
      // 		distinct = undefined;
      // 	}
      // 	const result = this.buildSelectQuery({
      // 		table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
      // 		fields: {},
      // 		fieldsFlat: selectionForBuild.map(({ field }) => ({
      // 			path: [],
      // 			field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
      // 		})),
      // 		where,
      // 		limit,
      // 		offset,
      // 		joins,
      // 		orderBy,
      // 		distinct,
      // 	});
      // 	return {
      // 		tableTsKey: tableConfig.tsName,
      // 		sql: result,
      // 		selection,
      // 	};
      // }
      buildRelationalQueryWithoutPK({
        fullSchema,
        schema,
        tableNamesMap,
        table,
        tableConfig,
        queryConfig: config,
        tableAlias,
        nestedQueryRelation,
        joinOn
      }) {
        let selection = [];
        let limit, offset, orderBy = [], where;
        const joins = [];
        if (config === true) {
          const selectionEntries = Object.entries(tableConfig.columns);
          selection = selectionEntries.map(([key, value]) => ({
            dbKey: value.name,
            tsKey: key,
            field: (0, import_alias.aliasedTableColumn)(value, tableAlias),
            relationTableTsKey: void 0,
            isJson: false,
            selection: []
          }));
        } else {
          const aliasedColumns = Object.fromEntries(
            Object.entries(tableConfig.columns).map(([key, value]) => [key, (0, import_alias.aliasedTableColumn)(value, tableAlias)])
          );
          if (config.where) {
            const whereSql = typeof config.where === "function" ? config.where(aliasedColumns, (0, import_relations.getOperators)()) : config.where;
            where = whereSql && (0, import_alias.mapColumnsInSQLToAlias)(whereSql, tableAlias);
          }
          const fieldsSelection = [];
          let selectedColumns = [];
          if (config.columns) {
            let isIncludeMode = false;
            for (const [field, value] of Object.entries(config.columns)) {
              if (value === void 0) {
                continue;
              }
              if (field in tableConfig.columns) {
                if (!isIncludeMode && value === true) {
                  isIncludeMode = true;
                }
                selectedColumns.push(field);
              }
            }
            if (selectedColumns.length > 0) {
              selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
            }
          } else {
            selectedColumns = Object.keys(tableConfig.columns);
          }
          for (const field of selectedColumns) {
            const column = tableConfig.columns[field];
            fieldsSelection.push({ tsKey: field, value: column });
          }
          let selectedRelations = [];
          if (config.with) {
            selectedRelations = Object.entries(config.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey] }));
          }
          let extras;
          if (config.extras) {
            extras = typeof config.extras === "function" ? config.extras(aliasedColumns, { sql: import_sql2.sql }) : config.extras;
            for (const [tsKey, value] of Object.entries(extras)) {
              fieldsSelection.push({
                tsKey,
                value: (0, import_alias.mapColumnsInAliasedSQLToAlias)(value, tableAlias)
              });
            }
          }
          for (const { tsKey, value } of fieldsSelection) {
            selection.push({
              dbKey: (0, import_entity.is)(value, import_sql2.SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
              tsKey,
              field: (0, import_entity.is)(value, import_column.Column) ? (0, import_alias.aliasedTableColumn)(value, tableAlias) : value,
              relationTableTsKey: void 0,
              isJson: false,
              selection: []
            });
          }
          let orderByOrig = typeof config.orderBy === "function" ? config.orderBy(aliasedColumns, (0, import_relations.getOrderByOperators)()) : config.orderBy ?? [];
          if (!Array.isArray(orderByOrig)) {
            orderByOrig = [orderByOrig];
          }
          orderBy = orderByOrig.map((orderByValue) => {
            if ((0, import_entity.is)(orderByValue, import_column.Column)) {
              return (0, import_alias.aliasedTableColumn)(orderByValue, tableAlias);
            }
            return (0, import_alias.mapColumnsInSQLToAlias)(orderByValue, tableAlias);
          });
          limit = config.limit;
          offset = config.offset;
          for (const {
            tsKey: selectedRelationTsKey,
            queryConfig: selectedRelationConfigValue,
            relation
          } of selectedRelations) {
            const normalizedRelation = (0, import_relations.normalizeRelation)(schema, tableNamesMap, relation);
            const relationTableName = (0, import_table2.getTableUniqueName)(relation.referencedTable);
            const relationTableTsName = tableNamesMap[relationTableName];
            const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
            const joinOn2 = (0, import_sql.and)(
              ...normalizedRelation.fields.map(
                (field2, i) => (0, import_sql.eq)(
                  (0, import_alias.aliasedTableColumn)(normalizedRelation.references[i], relationTableAlias),
                  (0, import_alias.aliasedTableColumn)(field2, tableAlias)
                )
              )
            );
            const builtRelation = this.buildRelationalQueryWithoutPK({
              fullSchema,
              schema,
              tableNamesMap,
              table: fullSchema[relationTableTsName],
              tableConfig: schema[relationTableTsName],
              queryConfig: (0, import_entity.is)(relation, import_relations.One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
              tableAlias: relationTableAlias,
              joinOn: joinOn2,
              nestedQueryRelation: relation
            });
            const field = import_sql2.sql`${import_sql2.sql.identifier(relationTableAlias)}.${import_sql2.sql.identifier("data")}`.as(selectedRelationTsKey);
            joins.push({
              on: import_sql2.sql`true`,
              table: new import_subquery.Subquery(builtRelation.sql, {}, relationTableAlias),
              alias: relationTableAlias,
              joinType: "left",
              lateral: true
            });
            selection.push({
              dbKey: selectedRelationTsKey,
              tsKey: selectedRelationTsKey,
              field,
              relationTableTsKey: relationTableTsName,
              isJson: true,
              selection: builtRelation.selection
            });
          }
        }
        if (selection.length === 0) {
          throw new import_errors.DrizzleError({ message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")` });
        }
        let result;
        where = (0, import_sql.and)(joinOn, where);
        if (nestedQueryRelation) {
          let field = import_sql2.sql`json_build_array(${import_sql2.sql.join(
            selection.map(
              ({ field: field2, tsKey, isJson }) => isJson ? import_sql2.sql`${import_sql2.sql.identifier(`${tableAlias}_${tsKey}`)}.${import_sql2.sql.identifier("data")}` : (0, import_entity.is)(field2, import_sql2.SQL.Aliased) ? field2.sql : field2
            ),
            import_sql2.sql`, `
          )})`;
          if ((0, import_entity.is)(nestedQueryRelation, import_relations.Many)) {
            field = import_sql2.sql`coalesce(json_agg(${field}${orderBy.length > 0 ? import_sql2.sql` order by ${import_sql2.sql.join(orderBy, import_sql2.sql`, `)}` : void 0}), '[]'::json)`;
          }
          const nestedSelection = [{
            dbKey: "data",
            tsKey: "data",
            field: field.as("data"),
            isJson: true,
            relationTableTsKey: tableConfig.tsName,
            selection
          }];
          const needsSubquery = limit !== void 0 || offset !== void 0 || orderBy.length > 0;
          if (needsSubquery) {
            result = this.buildSelectQuery({
              table: (0, import_alias.aliasedTable)(table, tableAlias),
              fields: {},
              fieldsFlat: [{
                path: [],
                field: import_sql2.sql.raw("*")
              }],
              where,
              limit,
              offset,
              orderBy,
              setOperators: []
            });
            where = void 0;
            limit = void 0;
            offset = void 0;
            orderBy = [];
          } else {
            result = (0, import_alias.aliasedTable)(table, tableAlias);
          }
          result = this.buildSelectQuery({
            table: (0, import_entity.is)(result, import_table.PgTable) ? result : new import_subquery.Subquery(result, {}, tableAlias),
            fields: {},
            fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
              path: [],
              field: (0, import_entity.is)(field2, import_column.Column) ? (0, import_alias.aliasedTableColumn)(field2, tableAlias) : field2
            })),
            joins,
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
        } else {
          result = this.buildSelectQuery({
            table: (0, import_alias.aliasedTable)(table, tableAlias),
            fields: {},
            fieldsFlat: selection.map(({ field }) => ({
              path: [],
              field: (0, import_entity.is)(field, import_column.Column) ? (0, import_alias.aliasedTableColumn)(field, tableAlias) : field
            })),
            joins,
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
        }
        return {
          tableTsKey: tableConfig.tsName,
          sql: result,
          selection
        };
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/query-builders/query-builder.cjs
var require_query_builder = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/query-builders/query-builder.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_builder_exports = {};
    __export(query_builder_exports, {
      TypedQueryBuilder: () => TypedQueryBuilder
    });
    module2.exports = __toCommonJS(query_builder_exports);
    var import_entity = require_entity();
    var TypedQueryBuilder = class {
      static [import_entity.entityKind] = "TypedQueryBuilder";
      /** @internal */
      getSelectedFields() {
        return this._.selectedFields;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/select.cjs
var require_select2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/select.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except2, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except2)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var select_exports = {};
    __export(select_exports, {
      PgSelectBase: () => PgSelectBase,
      PgSelectBuilder: () => PgSelectBuilder,
      PgSelectQueryBuilderBase: () => PgSelectQueryBuilderBase,
      except: () => except,
      exceptAll: () => exceptAll,
      intersect: () => intersect,
      intersectAll: () => intersectAll,
      union: () => union,
      unionAll: () => unionAll
    });
    module2.exports = __toCommonJS(select_exports);
    var import_entity = require_entity();
    var import_view_base = require_view_base();
    var import_query_builder = require_query_builder();
    var import_query_promise = require_query_promise();
    var import_selection_proxy = require_selection_proxy();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_table = require_table();
    var import_tracing = require_tracing();
    var import_utils = require_utils3();
    var import_utils2 = require_utils3();
    var import_view_common = require_view_common();
    var import_utils3 = require_utils5();
    var PgSelectBuilder = class {
      static [import_entity.entityKind] = "PgSelectBuilder";
      fields;
      session;
      dialect;
      withList = [];
      distinct;
      constructor(config) {
        this.fields = config.fields;
        this.session = config.session;
        this.dialect = config.dialect;
        if (config.withList) {
          this.withList = config.withList;
        }
        this.distinct = config.distinct;
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      /**
       * Specify the table, subquery, or other target that you're
       * building a select query against.
       *
       * {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FROM | Postgres from documentation}
       */
      from(source) {
        const isPartialSelect = !!this.fields;
        const src = source;
        let fields;
        if (this.fields) {
          fields = this.fields;
        } else if ((0, import_entity.is)(src, import_subquery.Subquery)) {
          fields = Object.fromEntries(
            Object.keys(src._.selectedFields).map((key) => [key, src[key]])
          );
        } else if ((0, import_entity.is)(src, import_view_base.PgViewBase)) {
          fields = src[import_view_common.ViewBaseConfig].selectedFields;
        } else if ((0, import_entity.is)(src, import_sql.SQL)) {
          fields = {};
        } else {
          fields = (0, import_utils.getTableColumns)(src);
        }
        return new PgSelectBase({
          table: src,
          fields,
          isPartialSelect,
          session: this.session,
          dialect: this.dialect,
          withList: this.withList,
          distinct: this.distinct
        }).setToken(this.authToken);
      }
    };
    var PgSelectQueryBuilderBase = class extends import_query_builder.TypedQueryBuilder {
      static [import_entity.entityKind] = "PgSelectQueryBuilder";
      _;
      config;
      joinsNotNullableMap;
      tableName;
      isPartialSelect;
      session;
      dialect;
      cacheConfig = void 0;
      usedTables = /* @__PURE__ */ new Set();
      constructor({ table, fields, isPartialSelect, session, dialect, withList, distinct }) {
        super();
        this.config = {
          withList,
          table,
          fields: { ...fields },
          distinct,
          setOperators: []
        };
        this.isPartialSelect = isPartialSelect;
        this.session = session;
        this.dialect = dialect;
        this._ = {
          selectedFields: fields,
          config: this.config
        };
        this.tableName = (0, import_utils.getTableLikeName)(table);
        this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
        for (const item of (0, import_utils3.extractUsedTable)(table)) this.usedTables.add(item);
      }
      /** @internal */
      getUsedTables() {
        return [...this.usedTables];
      }
      createJoin(joinType, lateral) {
        return (table, on) => {
          const baseTableName = this.tableName;
          const tableName = (0, import_utils.getTableLikeName)(table);
          for (const item of (0, import_utils3.extractUsedTable)(table)) this.usedTables.add(item);
          if (typeof tableName === "string" && this.config.joins?.some((join) => join.alias === tableName)) {
            throw new Error(`Alias "${tableName}" is already used in this query`);
          }
          if (!this.isPartialSelect) {
            if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
              this.config.fields = {
                [baseTableName]: this.config.fields
              };
            }
            if (typeof tableName === "string" && !(0, import_entity.is)(table, import_sql.SQL)) {
              const selection = (0, import_entity.is)(table, import_subquery.Subquery) ? table._.selectedFields : (0, import_entity.is)(table, import_sql.View) ? table[import_view_common.ViewBaseConfig].selectedFields : table[import_table.Table.Symbol.Columns];
              this.config.fields[tableName] = selection;
            }
          }
          if (typeof on === "function") {
            on = on(
              new Proxy(
                this.config.fields,
                new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              )
            );
          }
          if (!this.config.joins) {
            this.config.joins = [];
          }
          this.config.joins.push({ on, table, joinType, alias: tableName, lateral });
          if (typeof tableName === "string") {
            switch (joinType) {
              case "left": {
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
              case "right": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "cross":
              case "inner": {
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "full": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
            }
          }
          return this;
        };
      }
      /**
       * Executes a `left join` operation by adding another table to the current query.
       *
       * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#left-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User; pets: Pet | null; }[] = await db.select()
       *   .from(users)
       *   .leftJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number | null; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .leftJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      leftJoin = this.createJoin("left", false);
      /**
       * Executes a `left join lateral` operation by adding subquery to the current query.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#left-join-lateral}
       *
       * @param table the subquery to join.
       * @param on the `on` clause.
       */
      leftJoinLateral = this.createJoin("left", true);
      /**
       * Executes a `right join` operation by adding another table to the current query.
       *
       * Calling this method associates each row of the joined table with the corresponding row from the main table, if a match is found. If no matching row exists, it sets all columns of the main table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#right-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User | null; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .rightJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number | null; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .rightJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      rightJoin = this.createJoin("right", false);
      /**
       * Executes an `inner join` operation, creating a new table by combining rows from two tables that have matching values.
       *
       * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .innerJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .innerJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      innerJoin = this.createJoin("inner", false);
      /**
       * Executes an `inner join lateral` operation, creating a new table by combining rows from two queries that have matching values.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join-lateral}
       *
       * @param table the subquery to join.
       * @param on the `on` clause.
       */
      innerJoinLateral = this.createJoin("inner", true);
      /**
       * Executes a `full join` operation by combining rows from two tables into a new table.
       *
       * Calling this method retrieves all rows from both main and joined tables, merging rows with matching values and filling in `null` for non-matching columns.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#full-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User | null; pets: Pet | null; }[] = await db.select()
       *   .from(users)
       *   .fullJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number | null; petId: number | null; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .fullJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      fullJoin = this.createJoin("full", false);
      /**
       * Executes a `cross join` operation by combining rows from two tables into a new table.
       *
       * Calling this method retrieves all rows from both main and joined tables, merging all rows from each table.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join}
       *
       * @param table the table to join.
       *
       * @example
       *
       * ```ts
       * // Select all users, each user with every pet
       * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .crossJoin(pets)
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .crossJoin(pets)
       * ```
       */
      crossJoin = this.createJoin("cross", false);
      /**
       * Executes a `cross join lateral` operation by combining rows from two queries into a new table.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method retrieves all rows from both main and joined queries, merging all rows from each query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join-lateral}
       *
       * @param table the query to join.
       */
      crossJoinLateral = this.createJoin("cross", true);
      createSetOperator(type, isAll) {
        return (rightSelection) => {
          const rightSelect = typeof rightSelection === "function" ? rightSelection(getPgSetOperators()) : rightSelection;
          if (!(0, import_utils.haveSameKeys)(this.getSelectedFields(), rightSelect.getSelectedFields())) {
            throw new Error(
              "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
            );
          }
          this.config.setOperators.push({ type, isAll, rightSelect });
          return this;
        };
      }
      /**
       * Adds `union` set operator to the query.
       *
       * Calling this method will combine the result sets of the `select` statements and remove any duplicate rows that appear across them.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#union}
       *
       * @example
       *
       * ```ts
       * // Select all unique names from customers and users tables
       * await db.select({ name: users.name })
       *   .from(users)
       *   .union(
       *     db.select({ name: customers.name }).from(customers)
       *   );
       * // or
       * import { union } from 'drizzle-orm/pg-core'
       *
       * await union(
       *   db.select({ name: users.name }).from(users),
       *   db.select({ name: customers.name }).from(customers)
       * );
       * ```
       */
      union = this.createSetOperator("union", false);
      /**
       * Adds `union all` set operator to the query.
       *
       * Calling this method will combine the result-set of the `select` statements and keep all duplicate rows that appear across them.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#union-all}
       *
       * @example
       *
       * ```ts
       * // Select all transaction ids from both online and in-store sales
       * await db.select({ transaction: onlineSales.transactionId })
       *   .from(onlineSales)
       *   .unionAll(
       *     db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
       *   );
       * // or
       * import { unionAll } from 'drizzle-orm/pg-core'
       *
       * await unionAll(
       *   db.select({ transaction: onlineSales.transactionId }).from(onlineSales),
       *   db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
       * );
       * ```
       */
      unionAll = this.createSetOperator("union", true);
      /**
       * Adds `intersect` set operator to the query.
       *
       * Calling this method will retain only the rows that are present in both result sets and eliminate duplicates.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect}
       *
       * @example
       *
       * ```ts
       * // Select course names that are offered in both departments A and B
       * await db.select({ courseName: depA.courseName })
       *   .from(depA)
       *   .intersect(
       *     db.select({ courseName: depB.courseName }).from(depB)
       *   );
       * // or
       * import { intersect } from 'drizzle-orm/pg-core'
       *
       * await intersect(
       *   db.select({ courseName: depA.courseName }).from(depA),
       *   db.select({ courseName: depB.courseName }).from(depB)
       * );
       * ```
       */
      intersect = this.createSetOperator("intersect", false);
      /**
       * Adds `intersect all` set operator to the query.
       *
       * Calling this method will retain only the rows that are present in both result sets including all duplicates.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect-all}
       *
       * @example
       *
       * ```ts
       * // Select all products and quantities that are ordered by both regular and VIP customers
       * await db.select({
       *   productId: regularCustomerOrders.productId,
       *   quantityOrdered: regularCustomerOrders.quantityOrdered
       * })
       * .from(regularCustomerOrders)
       * .intersectAll(
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * // or
       * import { intersectAll } from 'drizzle-orm/pg-core'
       *
       * await intersectAll(
       *   db.select({
       *     productId: regularCustomerOrders.productId,
       *     quantityOrdered: regularCustomerOrders.quantityOrdered
       *   })
       *   .from(regularCustomerOrders),
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * ```
       */
      intersectAll = this.createSetOperator("intersect", true);
      /**
       * Adds `except` set operator to the query.
       *
       * Calling this method will retrieve all unique rows from the left query, except for the rows that are present in the result set of the right query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#except}
       *
       * @example
       *
       * ```ts
       * // Select all courses offered in department A but not in department B
       * await db.select({ courseName: depA.courseName })
       *   .from(depA)
       *   .except(
       *     db.select({ courseName: depB.courseName }).from(depB)
       *   );
       * // or
       * import { except } from 'drizzle-orm/pg-core'
       *
       * await except(
       *   db.select({ courseName: depA.courseName }).from(depA),
       *   db.select({ courseName: depB.courseName }).from(depB)
       * );
       * ```
       */
      except = this.createSetOperator("except", false);
      /**
       * Adds `except all` set operator to the query.
       *
       * Calling this method will retrieve all rows from the left query, except for the rows that are present in the result set of the right query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#except-all}
       *
       * @example
       *
       * ```ts
       * // Select all products that are ordered by regular customers but not by VIP customers
       * await db.select({
       *   productId: regularCustomerOrders.productId,
       *   quantityOrdered: regularCustomerOrders.quantityOrdered,
       * })
       * .from(regularCustomerOrders)
       * .exceptAll(
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered,
       *   })
       *   .from(vipCustomerOrders)
       * );
       * // or
       * import { exceptAll } from 'drizzle-orm/pg-core'
       *
       * await exceptAll(
       *   db.select({
       *     productId: regularCustomerOrders.productId,
       *     quantityOrdered: regularCustomerOrders.quantityOrdered
       *   })
       *   .from(regularCustomerOrders),
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * ```
       */
      exceptAll = this.createSetOperator("except", true);
      /** @internal */
      addSetOperators(setOperators) {
        this.config.setOperators.push(...setOperators);
        return this;
      }
      /**
       * Adds a `where` clause to the query.
       *
       * Calling this method will select only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#filtering}
       *
       * @param where the `where` clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be selected.
       *
       * ```ts
       * // Select all cars with green color
       * await db.select().from(cars).where(eq(cars.color, 'green'));
       * // or
       * await db.select().from(cars).where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Select all BMW cars with a green color
       * await db.select().from(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Select all cars with the green or blue color
       * await db.select().from(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        if (typeof where === "function") {
          where = where(
            new Proxy(
              this.config.fields,
              new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
            )
          );
        }
        this.config.where = where;
        return this;
      }
      /**
       * Adds a `having` clause to the query.
       *
       * Calling this method will select only those rows that fulfill a specified condition. It is typically used with aggregate functions to filter the aggregated data based on a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#aggregations}
       *
       * @param having the `having` clause.
       *
       * @example
       *
       * ```ts
       * // Select all brands with more than one car
       * await db.select({
       * 	brand: cars.brand,
       * 	count: sql<number>`cast(count(${cars.id}) as int)`,
       * })
       *   .from(cars)
       *   .groupBy(cars.brand)
       *   .having(({ count }) => gt(count, 1));
       * ```
       */
      having(having) {
        if (typeof having === "function") {
          having = having(
            new Proxy(
              this.config.fields,
              new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
            )
          );
        }
        this.config.having = having;
        return this;
      }
      groupBy(...columns) {
        if (typeof columns[0] === "function") {
          const groupBy = columns[0](
            new Proxy(
              this.config.fields,
              new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
            )
          );
          this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
        } else {
          this.config.groupBy = columns;
        }
        return this;
      }
      orderBy(...columns) {
        if (typeof columns[0] === "function") {
          const orderBy = columns[0](
            new Proxy(
              this.config.fields,
              new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
            )
          );
          const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
          if (this.config.setOperators.length > 0) {
            this.config.setOperators.at(-1).orderBy = orderByArray;
          } else {
            this.config.orderBy = orderByArray;
          }
        } else {
          const orderByArray = columns;
          if (this.config.setOperators.length > 0) {
            this.config.setOperators.at(-1).orderBy = orderByArray;
          } else {
            this.config.orderBy = orderByArray;
          }
        }
        return this;
      }
      /**
       * Adds a `limit` clause to the query.
       *
       * Calling this method will set the maximum number of rows that will be returned by this query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
       *
       * @param limit the `limit` clause.
       *
       * @example
       *
       * ```ts
       * // Get the first 10 people from this query.
       * await db.select().from(people).limit(10);
       * ```
       */
      limit(limit) {
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).limit = limit;
        } else {
          this.config.limit = limit;
        }
        return this;
      }
      /**
       * Adds an `offset` clause to the query.
       *
       * Calling this method will skip a number of rows when returning results from this query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
       *
       * @param offset the `offset` clause.
       *
       * @example
       *
       * ```ts
       * // Get the 10th-20th people from this query.
       * await db.select().from(people).offset(10).limit(10);
       * ```
       */
      offset(offset) {
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).offset = offset;
        } else {
          this.config.offset = offset;
        }
        return this;
      }
      /**
       * Adds a `for` clause to the query.
       *
       * Calling this method will specify a lock strength for this query that controls how strictly it acquires exclusive access to the rows being queried.
       *
       * See docs: {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE}
       *
       * @param strength the lock strength.
       * @param config the lock configuration.
       */
      for(strength, config = {}) {
        this.config.lockingClause = { strength, config };
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildSelectQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      as(alias) {
        const usedTables = [];
        usedTables.push(...(0, import_utils3.extractUsedTable)(this.config.table));
        if (this.config.joins) {
          for (const it of this.config.joins) usedTables.push(...(0, import_utils3.extractUsedTable)(it.table));
        }
        return new Proxy(
          new import_subquery.Subquery(this.getSQL(), this.config.fields, alias, false, [...new Set(usedTables)]),
          new import_selection_proxy.SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
      /** @internal */
      getSelectedFields() {
        return new Proxy(
          this.config.fields,
          new import_selection_proxy.SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
      $dynamic() {
        return this;
      }
      $withCache(config) {
        this.cacheConfig = config === void 0 ? { config: {}, enable: true, autoInvalidate: true } : config === false ? { enable: false } : { enable: true, autoInvalidate: true, ...config };
        return this;
      }
    };
    var PgSelectBase = class extends PgSelectQueryBuilderBase {
      static [import_entity.entityKind] = "PgSelect";
      /** @internal */
      _prepare(name) {
        const { session, config, dialect, joinsNotNullableMap, authToken, cacheConfig, usedTables } = this;
        if (!session) {
          throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
        }
        const { fields } = config;
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          const fieldsList = (0, import_utils2.orderSelectedFields)(fields);
          const query = session.prepareQuery(dialect.sqlToQuery(this.getSQL()), fieldsList, name, true, void 0, {
            type: "select",
            tables: [...usedTables]
          }, cacheConfig);
          query.joinsNotNullableMap = joinsNotNullableMap;
          return query.setToken(authToken);
        });
      }
      /**
       * Create a prepared statement for this query. This allows
       * the database to remember this query for the given session
       * and call it by name, rather than specifying the full query.
       *
       * {@link https://www.postgresql.org/docs/current/sql-prepare.html | Postgres prepare documentation}
       */
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      };
    };
    (0, import_utils.applyMixins)(PgSelectBase, [import_query_promise.QueryPromise]);
    function createSetOperator(type, isAll) {
      return (leftSelect, rightSelect, ...restSelects) => {
        const setOperators = [rightSelect, ...restSelects].map((select) => ({
          type,
          isAll,
          rightSelect: select
        }));
        for (const setOperator of setOperators) {
          if (!(0, import_utils.haveSameKeys)(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
            throw new Error(
              "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
            );
          }
        }
        return leftSelect.addSetOperators(setOperators);
      };
    }
    var getPgSetOperators = () => ({
      union,
      unionAll,
      intersect,
      intersectAll,
      except,
      exceptAll
    });
    var union = createSetOperator("union", false);
    var unionAll = createSetOperator("union", true);
    var intersect = createSetOperator("intersect", false);
    var intersectAll = createSetOperator("intersect", true);
    var except = createSetOperator("except", false);
    var exceptAll = createSetOperator("except", true);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/query-builder.cjs
var require_query_builder2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/query-builder.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_builder_exports = {};
    __export(query_builder_exports, {
      QueryBuilder: () => QueryBuilder
    });
    module2.exports = __toCommonJS(query_builder_exports);
    var import_entity = require_entity();
    var import_dialect = require_dialect();
    var import_selection_proxy = require_selection_proxy();
    var import_subquery = require_subquery();
    var import_select = require_select2();
    var QueryBuilder = class {
      static [import_entity.entityKind] = "PgQueryBuilder";
      dialect;
      dialectConfig;
      constructor(dialect) {
        this.dialect = (0, import_entity.is)(dialect, import_dialect.PgDialect) ? dialect : void 0;
        this.dialectConfig = (0, import_entity.is)(dialect, import_dialect.PgDialect) ? void 0 : dialect;
      }
      $with = (alias, selection) => {
        const queryBuilder = this;
        const as = (qb) => {
          if (typeof qb === "function") {
            qb = qb(queryBuilder);
          }
          return new Proxy(
            new import_subquery.WithSubquery(
              qb.getSQL(),
              selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
              alias,
              true
            ),
            new import_selection_proxy.SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
          );
        };
        return { as };
      };
      with(...queries) {
        const self = this;
        function select(fields) {
          return new import_select.PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            withList: queries
          });
        }
        function selectDistinct(fields) {
          return new import_select.PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            distinct: true
          });
        }
        function selectDistinctOn(on, fields) {
          return new import_select.PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            distinct: { on }
          });
        }
        return { select, selectDistinct, selectDistinctOn };
      }
      select(fields) {
        return new import_select.PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect()
        });
      }
      selectDistinct(fields) {
        return new import_select.PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect(),
          distinct: true
        });
      }
      selectDistinctOn(on, fields) {
        return new import_select.PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect(),
          distinct: { on }
        });
      }
      // Lazy load dialect to avoid circular dependency
      getDialect() {
        if (!this.dialect) {
          this.dialect = new import_dialect.PgDialect(this.dialectConfig);
        }
        return this.dialect;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/view.cjs
var require_view = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/view.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var view_exports = {};
    __export(view_exports, {
      DefaultViewBuilderCore: () => DefaultViewBuilderCore,
      ManualMaterializedViewBuilder: () => ManualMaterializedViewBuilder,
      ManualViewBuilder: () => ManualViewBuilder,
      MaterializedViewBuilder: () => MaterializedViewBuilder,
      MaterializedViewBuilderCore: () => MaterializedViewBuilderCore,
      PgMaterializedView: () => PgMaterializedView,
      PgMaterializedViewConfig: () => PgMaterializedViewConfig,
      PgView: () => PgView,
      ViewBuilder: () => ViewBuilder,
      isPgMaterializedView: () => isPgMaterializedView,
      isPgView: () => isPgView,
      pgMaterializedView: () => pgMaterializedView,
      pgMaterializedViewWithSchema: () => pgMaterializedViewWithSchema,
      pgView: () => pgView,
      pgViewWithSchema: () => pgViewWithSchema
    });
    module2.exports = __toCommonJS(view_exports);
    var import_entity = require_entity();
    var import_selection_proxy = require_selection_proxy();
    var import_utils = require_utils3();
    var import_query_builder = require_query_builder2();
    var import_table = require_table2();
    var import_view_base = require_view_base();
    var import_view_common = require_view_common2();
    var DefaultViewBuilderCore = class {
      constructor(name, schema) {
        this.name = name;
        this.schema = schema;
      }
      static [import_entity.entityKind] = "PgDefaultViewBuilderCore";
      config = {};
      with(config) {
        this.config.with = config;
        return this;
      }
    };
    var ViewBuilder = class extends DefaultViewBuilderCore {
      static [import_entity.entityKind] = "PgViewBuilder";
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(new import_query_builder.QueryBuilder());
        }
        const selectionProxy = new import_selection_proxy.SelectionProxyHandler({
          alias: this.name,
          sqlBehavior: "error",
          sqlAliasedBehavior: "alias",
          replaceOriginalName: true
        });
        const aliasedSelection = new Proxy(qb.getSelectedFields(), selectionProxy);
        return new Proxy(
          new PgView({
            pgConfig: this.config,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: aliasedSelection,
              query: qb.getSQL().inlineParams()
            }
          }),
          selectionProxy
        );
      }
    };
    var ManualViewBuilder = class extends DefaultViewBuilderCore {
      static [import_entity.entityKind] = "PgManualViewBuilder";
      columns;
      constructor(name, columns, schema) {
        super(name, schema);
        this.columns = (0, import_utils.getTableColumns)((0, import_table.pgTable)(name, columns));
      }
      existing() {
        return new Proxy(
          new PgView({
            pgConfig: void 0,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: void 0
            }
          }),
          new import_selection_proxy.SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
      as(query) {
        return new Proxy(
          new PgView({
            pgConfig: this.config,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: query.inlineParams()
            }
          }),
          new import_selection_proxy.SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
    };
    var MaterializedViewBuilderCore = class {
      constructor(name, schema) {
        this.name = name;
        this.schema = schema;
      }
      static [import_entity.entityKind] = "PgMaterializedViewBuilderCore";
      config = {};
      using(using) {
        this.config.using = using;
        return this;
      }
      with(config) {
        this.config.with = config;
        return this;
      }
      tablespace(tablespace) {
        this.config.tablespace = tablespace;
        return this;
      }
      withNoData() {
        this.config.withNoData = true;
        return this;
      }
    };
    var MaterializedViewBuilder = class extends MaterializedViewBuilderCore {
      static [import_entity.entityKind] = "PgMaterializedViewBuilder";
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(new import_query_builder.QueryBuilder());
        }
        const selectionProxy = new import_selection_proxy.SelectionProxyHandler({
          alias: this.name,
          sqlBehavior: "error",
          sqlAliasedBehavior: "alias",
          replaceOriginalName: true
        });
        const aliasedSelection = new Proxy(qb.getSelectedFields(), selectionProxy);
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              with: this.config.with,
              using: this.config.using,
              tablespace: this.config.tablespace,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: aliasedSelection,
              query: qb.getSQL().inlineParams()
            }
          }),
          selectionProxy
        );
      }
    };
    var ManualMaterializedViewBuilder = class extends MaterializedViewBuilderCore {
      static [import_entity.entityKind] = "PgManualMaterializedViewBuilder";
      columns;
      constructor(name, columns, schema) {
        super(name, schema);
        this.columns = (0, import_utils.getTableColumns)((0, import_table.pgTable)(name, columns));
      }
      existing() {
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              tablespace: this.config.tablespace,
              using: this.config.using,
              with: this.config.with,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: void 0
            }
          }),
          new import_selection_proxy.SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
      as(query) {
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              tablespace: this.config.tablespace,
              using: this.config.using,
              with: this.config.with,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: query.inlineParams()
            }
          }),
          new import_selection_proxy.SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
    };
    var PgView = class extends import_view_base.PgViewBase {
      static [import_entity.entityKind] = "PgView";
      [import_view_common.PgViewConfig];
      constructor({ pgConfig, config }) {
        super(config);
        if (pgConfig) {
          this[import_view_common.PgViewConfig] = {
            with: pgConfig.with
          };
        }
      }
    };
    var PgMaterializedViewConfig = /* @__PURE__ */ Symbol.for("drizzle:PgMaterializedViewConfig");
    var PgMaterializedView = class extends import_view_base.PgViewBase {
      static [import_entity.entityKind] = "PgMaterializedView";
      [PgMaterializedViewConfig];
      constructor({ pgConfig, config }) {
        super(config);
        this[PgMaterializedViewConfig] = {
          with: pgConfig?.with,
          using: pgConfig?.using,
          tablespace: pgConfig?.tablespace,
          withNoData: pgConfig?.withNoData
        };
      }
    };
    function pgViewWithSchema(name, selection, schema) {
      if (selection) {
        return new ManualViewBuilder(name, selection, schema);
      }
      return new ViewBuilder(name, schema);
    }
    function pgMaterializedViewWithSchema(name, selection, schema) {
      if (selection) {
        return new ManualMaterializedViewBuilder(name, selection, schema);
      }
      return new MaterializedViewBuilder(name, schema);
    }
    function pgView(name, columns) {
      return pgViewWithSchema(name, columns, void 0);
    }
    function pgMaterializedView(name, columns) {
      return pgMaterializedViewWithSchema(name, columns, void 0);
    }
    function isPgView(obj) {
      return (0, import_entity.is)(obj, PgView);
    }
    function isPgMaterializedView(obj) {
      return (0, import_entity.is)(obj, PgMaterializedView);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/utils.cjs
var require_utils5 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/utils.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    __export(utils_exports, {
      extractUsedTable: () => extractUsedTable,
      getMaterializedViewConfig: () => getMaterializedViewConfig,
      getTableConfig: () => getTableConfig,
      getViewConfig: () => getViewConfig
    });
    module2.exports = __toCommonJS(utils_exports);
    var import_entity = require_entity();
    var import_table = require_table2();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_table2 = require_table();
    var import_view_common = require_view_common();
    var import_checks = require_checks();
    var import_foreign_keys = require_foreign_keys();
    var import_indexes = require_indexes();
    var import_policies = require_policies();
    var import_primary_keys = require_primary_keys();
    var import_unique_constraint = require_unique_constraint();
    var import_view_common2 = require_view_common2();
    var import_view = require_view();
    function getTableConfig(table) {
      const columns = Object.values(table[import_table2.Table.Symbol.Columns]);
      const indexes = [];
      const checks = [];
      const primaryKeys = [];
      const foreignKeys = Object.values(table[import_table.PgTable.Symbol.InlineForeignKeys]);
      const uniqueConstraints = [];
      const name = table[import_table2.Table.Symbol.Name];
      const schema = table[import_table2.Table.Symbol.Schema];
      const policies = [];
      const enableRLS = table[import_table.PgTable.Symbol.EnableRLS];
      const extraConfigBuilder = table[import_table.PgTable.Symbol.ExtraConfigBuilder];
      if (extraConfigBuilder !== void 0) {
        const extraConfig = extraConfigBuilder(table[import_table2.Table.Symbol.ExtraConfigColumns]);
        const extraValues = Array.isArray(extraConfig) ? extraConfig.flat(1) : Object.values(extraConfig);
        for (const builder of extraValues) {
          if ((0, import_entity.is)(builder, import_indexes.IndexBuilder)) {
            indexes.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_checks.CheckBuilder)) {
            checks.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_unique_constraint.UniqueConstraintBuilder)) {
            uniqueConstraints.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_primary_keys.PrimaryKeyBuilder)) {
            primaryKeys.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_foreign_keys.ForeignKeyBuilder)) {
            foreignKeys.push(builder.build(table));
          } else if ((0, import_entity.is)(builder, import_policies.PgPolicy)) {
            policies.push(builder);
          }
        }
      }
      return {
        columns,
        indexes,
        foreignKeys,
        checks,
        primaryKeys,
        uniqueConstraints,
        name,
        schema,
        policies,
        enableRLS
      };
    }
    function extractUsedTable(table) {
      if ((0, import_entity.is)(table, import_table.PgTable)) {
        return [table[import_table2.Schema] ? `${table[import_table2.Schema]}.${table[import_table2.Table.Symbol.BaseName]}` : table[import_table2.Table.Symbol.BaseName]];
      }
      if ((0, import_entity.is)(table, import_subquery.Subquery)) {
        return table._.usedTables ?? [];
      }
      if ((0, import_entity.is)(table, import_sql.SQL)) {
        return table.usedTables ?? [];
      }
      return [];
    }
    function getViewConfig(view) {
      return {
        ...view[import_view_common.ViewBaseConfig],
        ...view[import_view_common2.PgViewConfig]
      };
    }
    function getMaterializedViewConfig(view) {
      return {
        ...view[import_view_common.ViewBaseConfig],
        ...view[import_view.PgMaterializedViewConfig]
      };
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/delete.cjs
var require_delete = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/delete.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var delete_exports = {};
    __export(delete_exports, {
      PgDeleteBase: () => PgDeleteBase
    });
    module2.exports = __toCommonJS(delete_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var import_selection_proxy = require_selection_proxy();
    var import_table = require_table();
    var import_tracing = require_tracing();
    var import_utils = require_utils3();
    var import_utils2 = require_utils5();
    var PgDeleteBase = class extends import_query_promise.QueryPromise {
      constructor(table, session, dialect, withList) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { table, withList };
      }
      static [import_entity.entityKind] = "PgDelete";
      config;
      cacheConfig;
      /**
       * Adds a `where` clause to the query.
       *
       * Calling this method will delete only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/delete}
       *
       * @param where the `where` clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be deleted.
       *
       * ```ts
       * // Delete all cars with green color
       * await db.delete(cars).where(eq(cars.color, 'green'));
       * // or
       * await db.delete(cars).where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Delete all BMW cars with a green color
       * await db.delete(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Delete all cars with the green or blue color
       * await db.delete(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        this.config.where = where;
        return this;
      }
      returning(fields = this.config.table[import_table.Table.Symbol.Columns]) {
        this.config.returningFields = fields;
        this.config.returning = (0, import_utils.orderSelectedFields)(fields);
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildDeleteQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
            type: "delete",
            tables: (0, import_utils2.extractUsedTable)(this.config.table)
          }, this.cacheConfig);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      };
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new import_selection_proxy.SelectionProxyHandler({
            alias: (0, import_table.getTableName)(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/insert.cjs
var require_insert = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/insert.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var insert_exports = {};
    __export(insert_exports, {
      PgInsertBase: () => PgInsertBase,
      PgInsertBuilder: () => PgInsertBuilder
    });
    module2.exports = __toCommonJS(insert_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var import_selection_proxy = require_selection_proxy();
    var import_sql = require_sql();
    var import_table = require_table();
    var import_tracing = require_tracing();
    var import_utils = require_utils3();
    var import_utils2 = require_utils5();
    var import_query_builder = require_query_builder2();
    var PgInsertBuilder = class {
      constructor(table, session, dialect, withList, overridingSystemValue_) {
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.withList = withList;
        this.overridingSystemValue_ = overridingSystemValue_;
      }
      static [import_entity.entityKind] = "PgInsertBuilder";
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      overridingSystemValue() {
        this.overridingSystemValue_ = true;
        return this;
      }
      values(values) {
        values = Array.isArray(values) ? values : [values];
        if (values.length === 0) {
          throw new Error("values() must be called with at least one value");
        }
        const mappedValues = values.map((entry) => {
          const result = {};
          const cols = this.table[import_table.Table.Symbol.Columns];
          for (const colKey of Object.keys(entry)) {
            const colValue = entry[colKey];
            result[colKey] = (0, import_entity.is)(colValue, import_sql.SQL) ? colValue : new import_sql.Param(colValue, cols[colKey]);
          }
          return result;
        });
        return new PgInsertBase(
          this.table,
          mappedValues,
          this.session,
          this.dialect,
          this.withList,
          false,
          this.overridingSystemValue_
        ).setToken(this.authToken);
      }
      select(selectQuery) {
        const select = typeof selectQuery === "function" ? selectQuery(new import_query_builder.QueryBuilder()) : selectQuery;
        if (!(0, import_entity.is)(select, import_sql.SQL) && !(0, import_utils.haveSameKeys)(this.table[import_table.Columns], select._.selectedFields)) {
          throw new Error(
            "Insert select error: selected fields are not the same or are in a different order compared to the table definition"
          );
        }
        return new PgInsertBase(this.table, select, this.session, this.dialect, this.withList, true);
      }
    };
    var PgInsertBase = class extends import_query_promise.QueryPromise {
      constructor(table, values, session, dialect, withList, select, overridingSystemValue_) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { table, values, withList, select, overridingSystemValue_ };
      }
      static [import_entity.entityKind] = "PgInsert";
      config;
      cacheConfig;
      returning(fields = this.config.table[import_table.Table.Symbol.Columns]) {
        this.config.returningFields = fields;
        this.config.returning = (0, import_utils.orderSelectedFields)(fields);
        return this;
      }
      /**
       * Adds an `on conflict do nothing` clause to the query.
       *
       * Calling this method simply avoids inserting a row as its alternative action.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert#on-conflict-do-nothing}
       *
       * @param config The `target` and `where` clauses.
       *
       * @example
       * ```ts
       * // Insert one row and cancel the insert if there's a conflict
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoNothing();
       *
       * // Explicitly specify conflict target
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoNothing({ target: cars.id });
       * ```
       */
      onConflictDoNothing(config = {}) {
        if (config.target === void 0) {
          this.config.onConflict = import_sql.sql`do nothing`;
        } else {
          let targetColumn = "";
          targetColumn = Array.isArray(config.target) ? config.target.map((it) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
          const whereSql = config.where ? import_sql.sql` where ${config.where}` : void 0;
          this.config.onConflict = import_sql.sql`(${import_sql.sql.raw(targetColumn)})${whereSql} do nothing`;
        }
        return this;
      }
      /**
       * Adds an `on conflict do update` clause to the query.
       *
       * Calling this method will update the existing row that conflicts with the row proposed for insertion as its alternative action.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert#upserts-and-conflicts}
       *
       * @param config The `target`, `set` and `where` clauses.
       *
       * @example
       * ```ts
       * // Update the row if there's a conflict
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoUpdate({
       *     target: cars.id,
       *     set: { brand: 'Porsche' }
       *   });
       *
       * // Upsert with 'where' clause
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoUpdate({
       *     target: cars.id,
       *     set: { brand: 'newBMW' },
       *     targetWhere: sql`${cars.createdAt} > '2023-01-01'::date`,
       *   });
       * ```
       */
      onConflictDoUpdate(config) {
        if (config.where && (config.targetWhere || config.setWhere)) {
          throw new Error(
            'You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.'
          );
        }
        const whereSql = config.where ? import_sql.sql` where ${config.where}` : void 0;
        const targetWhereSql = config.targetWhere ? import_sql.sql` where ${config.targetWhere}` : void 0;
        const setWhereSql = config.setWhere ? import_sql.sql` where ${config.setWhere}` : void 0;
        const setSql = this.dialect.buildUpdateSet(this.config.table, (0, import_utils.mapUpdateSet)(this.config.table, config.set));
        let targetColumn = "";
        targetColumn = Array.isArray(config.target) ? config.target.map((it) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
        this.config.onConflict = import_sql.sql`(${import_sql.sql.raw(targetColumn)})${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`;
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildInsertQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
            type: "insert",
            tables: (0, import_utils2.extractUsedTable)(this.config.table)
          }, this.cacheConfig);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      };
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new import_selection_proxy.SelectionProxyHandler({
            alias: (0, import_table.getTableName)(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/refresh-materialized-view.cjs
var require_refresh_materialized_view = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/refresh-materialized-view.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var refresh_materialized_view_exports = {};
    __export(refresh_materialized_view_exports, {
      PgRefreshMaterializedView: () => PgRefreshMaterializedView
    });
    module2.exports = __toCommonJS(refresh_materialized_view_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var import_tracing = require_tracing();
    var PgRefreshMaterializedView = class extends import_query_promise.QueryPromise {
      constructor(view, session, dialect) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { view };
      }
      static [import_entity.entityKind] = "PgRefreshMaterializedView";
      config;
      concurrently() {
        if (this.config.withNoData !== void 0) {
          throw new Error("Cannot use concurrently and withNoData together");
        }
        this.config.concurrently = true;
        return this;
      }
      withNoData() {
        if (this.config.concurrently !== void 0) {
          throw new Error("Cannot use concurrently and withNoData together");
        }
        this.config.withNoData = true;
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildRefreshMaterializedViewQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), void 0, name, true);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      };
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/select.types.cjs
var require_select_types = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/select.types.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var select_types_exports = {};
    module2.exports = __toCommonJS(select_types_exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/update.cjs
var require_update = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/update.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var update_exports = {};
    __export(update_exports, {
      PgUpdateBase: () => PgUpdateBase,
      PgUpdateBuilder: () => PgUpdateBuilder
    });
    module2.exports = __toCommonJS(update_exports);
    var import_entity = require_entity();
    var import_table = require_table2();
    var import_query_promise = require_query_promise();
    var import_selection_proxy = require_selection_proxy();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_table2 = require_table();
    var import_utils = require_utils3();
    var import_view_common = require_view_common();
    var import_utils2 = require_utils5();
    var PgUpdateBuilder = class {
      constructor(table, session, dialect, withList) {
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.withList = withList;
      }
      static [import_entity.entityKind] = "PgUpdateBuilder";
      authToken;
      setToken(token) {
        this.authToken = token;
        return this;
      }
      set(values) {
        return new PgUpdateBase(
          this.table,
          (0, import_utils.mapUpdateSet)(this.table, values),
          this.session,
          this.dialect,
          this.withList
        ).setToken(this.authToken);
      }
    };
    var PgUpdateBase = class extends import_query_promise.QueryPromise {
      constructor(table, set, session, dialect, withList) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { set, table, withList, joins: [] };
        this.tableName = (0, import_utils.getTableLikeName)(table);
        this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
      }
      static [import_entity.entityKind] = "PgUpdate";
      config;
      tableName;
      joinsNotNullableMap;
      cacheConfig;
      from(source) {
        const src = source;
        const tableName = (0, import_utils.getTableLikeName)(src);
        if (typeof tableName === "string") {
          this.joinsNotNullableMap[tableName] = true;
        }
        this.config.from = src;
        return this;
      }
      getTableLikeFields(table) {
        if ((0, import_entity.is)(table, import_table.PgTable)) {
          return table[import_table2.Table.Symbol.Columns];
        } else if ((0, import_entity.is)(table, import_subquery.Subquery)) {
          return table._.selectedFields;
        }
        return table[import_view_common.ViewBaseConfig].selectedFields;
      }
      createJoin(joinType) {
        return (table, on) => {
          const tableName = (0, import_utils.getTableLikeName)(table);
          if (typeof tableName === "string" && this.config.joins.some((join) => join.alias === tableName)) {
            throw new Error(`Alias "${tableName}" is already used in this query`);
          }
          if (typeof on === "function") {
            const from = this.config.from && !(0, import_entity.is)(this.config.from, import_sql.SQL) ? this.getTableLikeFields(this.config.from) : void 0;
            on = on(
              new Proxy(
                this.config.table[import_table2.Table.Symbol.Columns],
                new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              ),
              from && new Proxy(
                from,
                new import_selection_proxy.SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              )
            );
          }
          this.config.joins.push({ on, table, joinType, alias: tableName });
          if (typeof tableName === "string") {
            switch (joinType) {
              case "left": {
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
              case "right": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "inner": {
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "full": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
            }
          }
          return this;
        };
      }
      leftJoin = this.createJoin("left");
      rightJoin = this.createJoin("right");
      innerJoin = this.createJoin("inner");
      fullJoin = this.createJoin("full");
      /**
       * Adds a 'where' clause to the query.
       *
       * Calling this method will update only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/update}
       *
       * @param where the 'where' clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be updated.
       *
       * ```ts
       * // Update all cars with green color
       * await db.update(cars).set({ color: 'red' })
       *   .where(eq(cars.color, 'green'));
       * // or
       * await db.update(cars).set({ color: 'red' })
       *   .where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Update all BMW cars with a green color
       * await db.update(cars).set({ color: 'red' })
       *   .where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Update all cars with the green or blue color
       * await db.update(cars).set({ color: 'red' })
       *   .where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        this.config.where = where;
        return this;
      }
      returning(fields) {
        if (!fields) {
          fields = Object.assign({}, this.config.table[import_table2.Table.Symbol.Columns]);
          if (this.config.from) {
            const tableName = (0, import_utils.getTableLikeName)(this.config.from);
            if (typeof tableName === "string" && this.config.from && !(0, import_entity.is)(this.config.from, import_sql.SQL)) {
              const fromFields = this.getTableLikeFields(this.config.from);
              fields[tableName] = fromFields;
            }
            for (const join of this.config.joins) {
              const tableName2 = (0, import_utils.getTableLikeName)(join.table);
              if (typeof tableName2 === "string" && !(0, import_entity.is)(join.table, import_sql.SQL)) {
                const fromFields = this.getTableLikeFields(join.table);
                fields[tableName2] = fromFields;
              }
            }
          }
        }
        this.config.returningFields = fields;
        this.config.returning = (0, import_utils.orderSelectedFields)(fields);
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildUpdateQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        const query = this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
          type: "insert",
          tables: (0, import_utils2.extractUsedTable)(this.config.table)
        }, this.cacheConfig);
        query.joinsNotNullableMap = this.joinsNotNullableMap;
        return query;
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = (placeholderValues) => {
        return this._prepare().execute(placeholderValues, this.authToken);
      };
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new import_selection_proxy.SelectionProxyHandler({
            alias: (0, import_table2.getTableName)(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/index.cjs
var require_query_builders = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_builders_exports = {};
    module2.exports = __toCommonJS(query_builders_exports);
    __reExport(query_builders_exports, require_delete(), module2.exports);
    __reExport(query_builders_exports, require_insert(), module2.exports);
    __reExport(query_builders_exports, require_query_builder2(), module2.exports);
    __reExport(query_builders_exports, require_refresh_materialized_view(), module2.exports);
    __reExport(query_builders_exports, require_select2(), module2.exports);
    __reExport(query_builders_exports, require_select_types(), module2.exports);
    __reExport(query_builders_exports, require_update(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/count.cjs
var require_count = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/count.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var count_exports = {};
    __export(count_exports, {
      PgCountBuilder: () => PgCountBuilder
    });
    module2.exports = __toCommonJS(count_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var PgCountBuilder = class _PgCountBuilder extends import_sql.SQL {
      constructor(params) {
        super(_PgCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);
        this.params = params;
        this.mapWith(Number);
        this.session = params.session;
        this.sql = _PgCountBuilder.buildCount(
          params.source,
          params.filters
        );
      }
      sql;
      token;
      static [import_entity.entityKind] = "PgCountBuilder";
      [Symbol.toStringTag] = "PgCountBuilder";
      session;
      static buildEmbeddedCount(source, filters) {
        return import_sql.sql`(select count(*) from ${source}${import_sql.sql.raw(" where ").if(filters)}${filters})`;
      }
      static buildCount(source, filters) {
        return import_sql.sql`select count(*) as count from ${source}${import_sql.sql.raw(" where ").if(filters)}${filters};`;
      }
      /** @intrnal */
      setToken(token) {
        this.token = token;
        return this;
      }
      then(onfulfilled, onrejected) {
        return Promise.resolve(this.session.count(this.sql, this.token)).then(
          onfulfilled,
          onrejected
        );
      }
      catch(onRejected) {
        return this.then(void 0, onRejected);
      }
      finally(onFinally) {
        return this.then(
          (value) => {
            onFinally?.();
            return value;
          },
          (reason) => {
            onFinally?.();
            throw reason;
          }
        );
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/query.cjs
var require_query3 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/query.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var query_exports = {};
    __export(query_exports, {
      PgRelationalQuery: () => PgRelationalQuery,
      RelationalQueryBuilder: () => RelationalQueryBuilder
    });
    module2.exports = __toCommonJS(query_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var import_relations = require_relations();
    var import_tracing = require_tracing();
    var RelationalQueryBuilder = class {
      constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session) {
        this.fullSchema = fullSchema;
        this.schema = schema;
        this.tableNamesMap = tableNamesMap;
        this.table = table;
        this.tableConfig = tableConfig;
        this.dialect = dialect;
        this.session = session;
      }
      static [import_entity.entityKind] = "PgRelationalQueryBuilder";
      findMany(config) {
        return new PgRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config ? config : {},
          "many"
        );
      }
      findFirst(config) {
        return new PgRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config ? { ...config, limit: 1 } : { limit: 1 },
          "first"
        );
      }
    };
    var PgRelationalQuery = class extends import_query_promise.QueryPromise {
      constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session, config, mode) {
        super();
        this.fullSchema = fullSchema;
        this.schema = schema;
        this.tableNamesMap = tableNamesMap;
        this.table = table;
        this.tableConfig = tableConfig;
        this.dialect = dialect;
        this.session = session;
        this.config = config;
        this.mode = mode;
      }
      static [import_entity.entityKind] = "PgRelationalQuery";
      /** @internal */
      _prepare(name) {
        return import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
          const { query, builtQuery } = this._toSQL();
          return this.session.prepareQuery(
            builtQuery,
            void 0,
            name,
            true,
            (rawRows, mapColumnValue) => {
              const rows = rawRows.map(
                (row) => (0, import_relations.mapRelationalRow)(this.schema, this.tableConfig, row, query.selection, mapColumnValue)
              );
              if (this.mode === "first") {
                return rows[0];
              }
              return rows;
            }
          );
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      _getQuery() {
        return this.dialect.buildRelationalQueryWithoutPK({
          fullSchema: this.fullSchema,
          schema: this.schema,
          tableNamesMap: this.tableNamesMap,
          table: this.table,
          tableConfig: this.tableConfig,
          queryConfig: this.config,
          tableAlias: this.tableConfig.tsName
        });
      }
      /** @internal */
      getSQL() {
        return this._getQuery().sql;
      }
      _toSQL() {
        const query = this._getQuery();
        const builtQuery = this.dialect.sqlToQuery(query.sql);
        return { query, builtQuery };
      }
      toSQL() {
        return this._toSQL().builtQuery;
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute() {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(void 0, this.authToken);
        });
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/raw.cjs
var require_raw = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/query-builders/raw.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var raw_exports = {};
    __export(raw_exports, {
      PgRaw: () => PgRaw
    });
    module2.exports = __toCommonJS(raw_exports);
    var import_entity = require_entity();
    var import_query_promise = require_query_promise();
    var PgRaw = class extends import_query_promise.QueryPromise {
      constructor(execute, sql, query, mapBatchResult) {
        super();
        this.execute = execute;
        this.sql = sql;
        this.query = query;
        this.mapBatchResult = mapBatchResult;
      }
      static [import_entity.entityKind] = "PgRaw";
      /** @internal */
      getSQL() {
        return this.sql;
      }
      getQuery() {
        return this.query;
      }
      mapResult(result, isFromBatch) {
        return isFromBatch ? this.mapBatchResult(result) : result;
      }
      _prepare() {
        return this;
      }
      /** @internal */
      isResponseInArrayMode() {
        return false;
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/db.cjs
var require_db = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/db.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var db_exports = {};
    __export(db_exports, {
      PgDatabase: () => PgDatabase,
      withReplicas: () => withReplicas
    });
    module2.exports = __toCommonJS(db_exports);
    var import_entity = require_entity();
    var import_query_builders = require_query_builders();
    var import_selection_proxy = require_selection_proxy();
    var import_sql = require_sql();
    var import_subquery = require_subquery();
    var import_count = require_count();
    var import_query = require_query3();
    var import_raw = require_raw();
    var import_refresh_materialized_view = require_refresh_materialized_view();
    var PgDatabase = class {
      constructor(dialect, session, schema) {
        this.dialect = dialect;
        this.session = session;
        this._ = schema ? {
          schema: schema.schema,
          fullSchema: schema.fullSchema,
          tableNamesMap: schema.tableNamesMap,
          session
        } : {
          schema: void 0,
          fullSchema: {},
          tableNamesMap: {},
          session
        };
        this.query = {};
        if (this._.schema) {
          for (const [tableName, columns] of Object.entries(this._.schema)) {
            this.query[tableName] = new import_query.RelationalQueryBuilder(
              schema.fullSchema,
              this._.schema,
              this._.tableNamesMap,
              schema.fullSchema[tableName],
              columns,
              dialect,
              session
            );
          }
        }
        this.$cache = { invalidate: async (_params) => {
        } };
      }
      static [import_entity.entityKind] = "PgDatabase";
      query;
      /**
       * Creates a subquery that defines a temporary named result set as a CTE.
       *
       * It is useful for breaking down complex queries into simpler parts and for reusing the result set in subsequent parts of the query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
       *
       * @param alias The alias for the subquery.
       *
       * Failure to provide an alias will result in a DrizzleTypeError, preventing the subquery from being referenced in other queries.
       *
       * @example
       *
       * ```ts
       * // Create a subquery with alias 'sq' and use it in the select query
       * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
       *
       * const result = await db.with(sq).select().from(sq);
       * ```
       *
       * To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query, you need to add aliases to them:
       *
       * ```ts
       * // Select an arbitrary SQL value as a field in a CTE and reference it in the main query
       * const sq = db.$with('sq').as(db.select({
       *   name: sql<string>`upper(${users.name})`.as('name'),
       * })
       * .from(users));
       *
       * const result = await db.with(sq).select({ name: sq.name }).from(sq);
       * ```
       */
      $with = (alias, selection) => {
        const self = this;
        const as = (qb) => {
          if (typeof qb === "function") {
            qb = qb(new import_query_builders.QueryBuilder(self.dialect));
          }
          return new Proxy(
            new import_subquery.WithSubquery(
              qb.getSQL(),
              selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
              alias,
              true
            ),
            new import_selection_proxy.SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
          );
        };
        return { as };
      };
      $count(source, filters) {
        return new import_count.PgCountBuilder({ source, filters, session: this.session });
      }
      $cache;
      /**
       * Incorporates a previously defined CTE (using `$with`) into the main query.
       *
       * This method allows the main query to reference a temporary named result set.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
       *
       * @param queries The CTEs to incorporate into the main query.
       *
       * @example
       *
       * ```ts
       * // Define a subquery 'sq' as a CTE using $with
       * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
       *
       * // Incorporate the CTE 'sq' into the main query and select from it
       * const result = await db.with(sq).select().from(sq);
       * ```
       */
      with(...queries) {
        const self = this;
        function select(fields) {
          return new import_query_builders.PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries
          });
        }
        function selectDistinct(fields) {
          return new import_query_builders.PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries,
            distinct: true
          });
        }
        function selectDistinctOn(on, fields) {
          return new import_query_builders.PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries,
            distinct: { on }
          });
        }
        function update(table) {
          return new import_query_builders.PgUpdateBuilder(table, self.session, self.dialect, queries);
        }
        function insert(table) {
          return new import_query_builders.PgInsertBuilder(table, self.session, self.dialect, queries);
        }
        function delete_(table) {
          return new import_query_builders.PgDeleteBase(table, self.session, self.dialect, queries);
        }
        return { select, selectDistinct, selectDistinctOn, update, insert, delete: delete_ };
      }
      select(fields) {
        return new import_query_builders.PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect
        });
      }
      selectDistinct(fields) {
        return new import_query_builders.PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect,
          distinct: true
        });
      }
      selectDistinctOn(on, fields) {
        return new import_query_builders.PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect,
          distinct: { on }
        });
      }
      /**
       * Creates an update query.
       *
       * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
       *
       * Use `.set()` method to specify which values to update.
       *
       * See docs: {@link https://orm.drizzle.team/docs/update}
       *
       * @param table The table to update.
       *
       * @example
       *
       * ```ts
       * // Update all rows in the 'cars' table
       * await db.update(cars).set({ color: 'red' });
       *
       * // Update rows with filters and conditions
       * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
       *
       * // Update with returning clause
       * const updatedCar: Car[] = await db.update(cars)
       *   .set({ color: 'red' })
       *   .where(eq(cars.id, 1))
       *   .returning();
       * ```
       */
      update(table) {
        return new import_query_builders.PgUpdateBuilder(table, this.session, this.dialect);
      }
      /**
       * Creates an insert query.
       *
       * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert}
       *
       * @param table The table to insert into.
       *
       * @example
       *
       * ```ts
       * // Insert one row
       * await db.insert(cars).values({ brand: 'BMW' });
       *
       * // Insert multiple rows
       * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
       *
       * // Insert with returning clause
       * const insertedCar: Car[] = await db.insert(cars)
       *   .values({ brand: 'BMW' })
       *   .returning();
       * ```
       */
      insert(table) {
        return new import_query_builders.PgInsertBuilder(table, this.session, this.dialect);
      }
      /**
       * Creates a delete query.
       *
       * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
       *
       * See docs: {@link https://orm.drizzle.team/docs/delete}
       *
       * @param table The table to delete from.
       *
       * @example
       *
       * ```ts
       * // Delete all rows in the 'cars' table
       * await db.delete(cars);
       *
       * // Delete rows with filters and conditions
       * await db.delete(cars).where(eq(cars.color, 'green'));
       *
       * // Delete with returning clause
       * const deletedCar: Car[] = await db.delete(cars)
       *   .where(eq(cars.id, 1))
       *   .returning();
       * ```
       */
      delete(table) {
        return new import_query_builders.PgDeleteBase(table, this.session, this.dialect);
      }
      refreshMaterializedView(view) {
        return new import_refresh_materialized_view.PgRefreshMaterializedView(view, this.session, this.dialect);
      }
      authToken;
      execute(query) {
        const sequel = typeof query === "string" ? import_sql.sql.raw(query) : query.getSQL();
        const builtQuery = this.dialect.sqlToQuery(sequel);
        const prepared = this.session.prepareQuery(
          builtQuery,
          void 0,
          void 0,
          false
        );
        return new import_raw.PgRaw(
          () => prepared.execute(void 0, this.authToken),
          sequel,
          builtQuery,
          (result) => prepared.mapResult(result, true)
        );
      }
      transaction(transaction, config) {
        return this.session.transaction(transaction, config);
      }
    };
    var withReplicas = (primary, replicas, getReplica = () => replicas[Math.floor(Math.random() * replicas.length)]) => {
      const select = (...args) => getReplica(replicas).select(...args);
      const selectDistinct = (...args) => getReplica(replicas).selectDistinct(...args);
      const selectDistinctOn = (...args) => getReplica(replicas).selectDistinctOn(...args);
      const $count = (...args) => getReplica(replicas).$count(...args);
      const _with = (...args) => getReplica(replicas).with(...args);
      const $with = (arg) => getReplica(replicas).$with(arg);
      const update = (...args) => primary.update(...args);
      const insert = (...args) => primary.insert(...args);
      const $delete = (...args) => primary.delete(...args);
      const execute = (...args) => primary.execute(...args);
      const transaction = (...args) => primary.transaction(...args);
      const refreshMaterializedView = (...args) => primary.refreshMaterializedView(...args);
      return {
        ...primary,
        update,
        insert,
        delete: $delete,
        execute,
        transaction,
        refreshMaterializedView,
        $primary: primary,
        $replicas: replicas,
        select,
        selectDistinct,
        selectDistinctOn,
        $count,
        $with,
        with: _with,
        get query() {
          return getReplica(replicas).query;
        }
      };
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/cache/core/cache.cjs
var require_cache = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/cache/core/cache.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var cache_exports = {};
    __export(cache_exports, {
      Cache: () => Cache,
      NoopCache: () => NoopCache,
      hashQuery: () => hashQuery
    });
    module2.exports = __toCommonJS(cache_exports);
    var import_entity = require_entity();
    var Cache = class {
      static [import_entity.entityKind] = "Cache";
    };
    var NoopCache = class extends Cache {
      strategy() {
        return "all";
      }
      static [import_entity.entityKind] = "NoopCache";
      async get(_key) {
        return void 0;
      }
      async put(_hashedQuery, _response, _tables, _config) {
      }
      async onMutate(_params) {
      }
    };
    async function hashQuery(sql, params) {
      const dataToHash = `${sql}-${JSON.stringify(params)}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(dataToHash);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = [...new Uint8Array(hashBuffer)];
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      return hashHex;
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/cache/core/index.cjs
var require_core = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/cache/core/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var core_exports = {};
    module2.exports = __toCommonJS(core_exports);
    __reExport(core_exports, require_cache(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/alias.cjs
var require_alias2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/alias.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var alias_exports = {};
    __export(alias_exports, {
      alias: () => alias
    });
    module2.exports = __toCommonJS(alias_exports);
    var import_alias = require_alias();
    function alias(table, alias2) {
      return new Proxy(table, new import_alias.TableAliasProxyHandler(alias2, false));
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/roles.cjs
var require_roles = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/roles.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var roles_exports = {};
    __export(roles_exports, {
      PgRole: () => PgRole,
      pgRole: () => pgRole
    });
    module2.exports = __toCommonJS(roles_exports);
    var import_entity = require_entity();
    var PgRole = class {
      constructor(name, config) {
        this.name = name;
        if (config) {
          this.createDb = config.createDb;
          this.createRole = config.createRole;
          this.inherit = config.inherit;
        }
      }
      static [import_entity.entityKind] = "PgRole";
      /** @internal */
      _existing;
      /** @internal */
      createDb;
      /** @internal */
      createRole;
      /** @internal */
      inherit;
      existing() {
        this._existing = true;
        return this;
      }
    };
    function pgRole(name, config) {
      return new PgRole(name, config);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/sequence.cjs
var require_sequence = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/sequence.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var sequence_exports = {};
    __export(sequence_exports, {
      PgSequence: () => PgSequence,
      isPgSequence: () => isPgSequence,
      pgSequence: () => pgSequence,
      pgSequenceWithSchema: () => pgSequenceWithSchema
    });
    module2.exports = __toCommonJS(sequence_exports);
    var import_entity = require_entity();
    var PgSequence = class {
      constructor(seqName, seqOptions, schema) {
        this.seqName = seqName;
        this.seqOptions = seqOptions;
        this.schema = schema;
      }
      static [import_entity.entityKind] = "PgSequence";
    };
    function pgSequence(name, options) {
      return pgSequenceWithSchema(name, options, void 0);
    }
    function pgSequenceWithSchema(name, options, schema) {
      return new PgSequence(name, options, schema);
    }
    function isPgSequence(obj) {
      return (0, import_entity.is)(obj, PgSequence);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/schema.cjs
var require_schema = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/schema.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var schema_exports = {};
    __export(schema_exports, {
      PgSchema: () => PgSchema,
      isPgSchema: () => isPgSchema,
      pgSchema: () => pgSchema
    });
    module2.exports = __toCommonJS(schema_exports);
    var import_entity = require_entity();
    var import_sql = require_sql();
    var import_enum = require_enum();
    var import_sequence = require_sequence();
    var import_table = require_table2();
    var import_view = require_view();
    var PgSchema = class {
      constructor(schemaName) {
        this.schemaName = schemaName;
      }
      static [import_entity.entityKind] = "PgSchema";
      table = (name, columns, extraConfig) => {
        return (0, import_table.pgTableWithSchema)(name, columns, extraConfig, this.schemaName);
      };
      view = (name, columns) => {
        return (0, import_view.pgViewWithSchema)(name, columns, this.schemaName);
      };
      materializedView = (name, columns) => {
        return (0, import_view.pgMaterializedViewWithSchema)(name, columns, this.schemaName);
      };
      enum(enumName, input) {
        return Array.isArray(input) ? (0, import_enum.pgEnumWithSchema)(
          enumName,
          [...input],
          this.schemaName
        ) : (0, import_enum.pgEnumObjectWithSchema)(enumName, input, this.schemaName);
      }
      sequence = (name, options) => {
        return (0, import_sequence.pgSequenceWithSchema)(name, options, this.schemaName);
      };
      getSQL() {
        return new import_sql.SQL([import_sql.sql.identifier(this.schemaName)]);
      }
      shouldOmitSQLParens() {
        return true;
      }
    };
    function isPgSchema(obj) {
      return (0, import_entity.is)(obj, PgSchema);
    }
    function pgSchema(name) {
      if (name === "public") {
        throw new Error(
          `You can't specify 'public' as schema name. Postgres is using public schema by default. If you want to use 'public' schema, just use pgTable() instead of creating a schema`
        );
      }
      return new PgSchema(name);
    }
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/session.cjs
var require_session = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/session.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var session_exports = {};
    __export(session_exports, {
      PgPreparedQuery: () => PgPreparedQuery,
      PgSession: () => PgSession,
      PgTransaction: () => PgTransaction
    });
    module2.exports = __toCommonJS(session_exports);
    var import_cache = require_cache();
    var import_entity = require_entity();
    var import_errors = require_errors();
    var import_sql = require_sql2();
    var import_tracing = require_tracing();
    var import_db = require_db();
    var PgPreparedQuery = class {
      constructor(query, cache, queryMetadata, cacheConfig) {
        this.query = query;
        this.cache = cache;
        this.queryMetadata = queryMetadata;
        this.cacheConfig = cacheConfig;
        if (cache && cache.strategy() === "all" && cacheConfig === void 0) {
          this.cacheConfig = { enable: true, autoInvalidate: true };
        }
        if (!this.cacheConfig?.enable) {
          this.cacheConfig = void 0;
        }
      }
      authToken;
      getQuery() {
        return this.query;
      }
      mapResult(response, _isFromBatch) {
        return response;
      }
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      static [import_entity.entityKind] = "PgPreparedQuery";
      /** @internal */
      joinsNotNullableMap;
      /** @internal */
      async queryWithCache(queryString, params, query) {
        if (this.cache === void 0 || (0, import_entity.is)(this.cache, import_cache.NoopCache) || this.queryMetadata === void 0) {
          try {
            return await query();
          } catch (e) {
            throw new import_errors.DrizzleQueryError(queryString, params, e);
          }
        }
        if (this.cacheConfig && !this.cacheConfig.enable) {
          try {
            return await query();
          } catch (e) {
            throw new import_errors.DrizzleQueryError(queryString, params, e);
          }
        }
        if ((this.queryMetadata.type === "insert" || this.queryMetadata.type === "update" || this.queryMetadata.type === "delete") && this.queryMetadata.tables.length > 0) {
          try {
            const [res] = await Promise.all([
              query(),
              this.cache.onMutate({ tables: this.queryMetadata.tables })
            ]);
            return res;
          } catch (e) {
            throw new import_errors.DrizzleQueryError(queryString, params, e);
          }
        }
        if (!this.cacheConfig) {
          try {
            return await query();
          } catch (e) {
            throw new import_errors.DrizzleQueryError(queryString, params, e);
          }
        }
        if (this.queryMetadata.type === "select") {
          const fromCache = await this.cache.get(
            this.cacheConfig.tag ?? await (0, import_cache.hashQuery)(queryString, params),
            this.queryMetadata.tables,
            this.cacheConfig.tag !== void 0,
            this.cacheConfig.autoInvalidate
          );
          if (fromCache === void 0) {
            let result;
            try {
              result = await query();
            } catch (e) {
              throw new import_errors.DrizzleQueryError(queryString, params, e);
            }
            await this.cache.put(
              this.cacheConfig.tag ?? await (0, import_cache.hashQuery)(queryString, params),
              result,
              // make sure we send tables that were used in a query only if user wants to invalidate it on each write
              this.cacheConfig.autoInvalidate ? this.queryMetadata.tables : [],
              this.cacheConfig.tag !== void 0,
              this.cacheConfig.config
            );
            return result;
          }
          return fromCache;
        }
        try {
          return await query();
        } catch (e) {
          throw new import_errors.DrizzleQueryError(queryString, params, e);
        }
      }
    };
    var PgSession = class {
      constructor(dialect) {
        this.dialect = dialect;
      }
      static [import_entity.entityKind] = "PgSession";
      /** @internal */
      execute(query, token) {
        return import_tracing.tracer.startActiveSpan("drizzle.operation", () => {
          const prepared = import_tracing.tracer.startActiveSpan("drizzle.prepareQuery", () => {
            return this.prepareQuery(
              this.dialect.sqlToQuery(query),
              void 0,
              void 0,
              false
            );
          });
          return prepared.setToken(token).execute(void 0, token);
        });
      }
      all(query) {
        return this.prepareQuery(
          this.dialect.sqlToQuery(query),
          void 0,
          void 0,
          false
        ).all();
      }
      /** @internal */
      async count(sql2, token) {
        const res = await this.execute(sql2, token);
        return Number(
          res[0]["count"]
        );
      }
    };
    var PgTransaction = class extends import_db.PgDatabase {
      constructor(dialect, session, schema, nestedIndex = 0) {
        super(dialect, session, schema);
        this.schema = schema;
        this.nestedIndex = nestedIndex;
      }
      static [import_entity.entityKind] = "PgTransaction";
      rollback() {
        throw new import_errors.TransactionRollbackError();
      }
      /** @internal */
      getTransactionConfigSQL(config) {
        const chunks = [];
        if (config.isolationLevel) {
          chunks.push(`isolation level ${config.isolationLevel}`);
        }
        if (config.accessMode) {
          chunks.push(config.accessMode);
        }
        if (typeof config.deferrable === "boolean") {
          chunks.push(config.deferrable ? "deferrable" : "not deferrable");
        }
        return import_sql.sql.raw(chunks.join(" "));
      }
      setTransaction(config) {
        return this.session.execute(import_sql.sql`set transaction ${this.getTransactionConfigSQL(config)}`);
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/subquery.cjs
var require_subquery2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/subquery.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var subquery_exports = {};
    module2.exports = __toCommonJS(subquery_exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/utils/index.cjs
var require_utils6 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/utils/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var utils_exports = {};
    module2.exports = __toCommonJS(utils_exports);
    __reExport(utils_exports, require_array(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/index.cjs
var require_pg_core = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/pg-core/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var pg_core_exports = {};
    module2.exports = __toCommonJS(pg_core_exports);
    __reExport(pg_core_exports, require_alias2(), module2.exports);
    __reExport(pg_core_exports, require_checks(), module2.exports);
    __reExport(pg_core_exports, require_columns(), module2.exports);
    __reExport(pg_core_exports, require_db(), module2.exports);
    __reExport(pg_core_exports, require_dialect(), module2.exports);
    __reExport(pg_core_exports, require_foreign_keys(), module2.exports);
    __reExport(pg_core_exports, require_indexes(), module2.exports);
    __reExport(pg_core_exports, require_policies(), module2.exports);
    __reExport(pg_core_exports, require_primary_keys(), module2.exports);
    __reExport(pg_core_exports, require_query_builders(), module2.exports);
    __reExport(pg_core_exports, require_roles(), module2.exports);
    __reExport(pg_core_exports, require_schema(), module2.exports);
    __reExport(pg_core_exports, require_sequence(), module2.exports);
    __reExport(pg_core_exports, require_session(), module2.exports);
    __reExport(pg_core_exports, require_subquery2(), module2.exports);
    __reExport(pg_core_exports, require_table2(), module2.exports);
    __reExport(pg_core_exports, require_unique_constraint(), module2.exports);
    __reExport(pg_core_exports, require_utils5(), module2.exports);
    __reExport(pg_core_exports, require_utils6(), module2.exports);
    __reExport(pg_core_exports, require_view_common2(), module2.exports);
    __reExport(pg_core_exports, require_view(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/node-postgres/session.cjs
var require_session2 = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/node-postgres/session.cjs"(exports2, module2) {
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var session_exports = {};
    __export(session_exports, {
      NodePgPreparedQuery: () => NodePgPreparedQuery,
      NodePgSession: () => NodePgSession,
      NodePgTransaction: () => NodePgTransaction
    });
    module2.exports = __toCommonJS(session_exports);
    var import_pg = __toESM(require_lib2(), 1);
    var import_core = require_core();
    var import_entity = require_entity();
    var import_logger = require_logger();
    var import_pg_core = require_pg_core();
    var import_session = require_session();
    var import_sql = require_sql();
    var import_tracing = require_tracing();
    var import_utils = require_utils3();
    var { Pool, types } = import_pg.default;
    var NodePgPreparedQuery = class extends import_session.PgPreparedQuery {
      constructor(client, queryString, params, logger, cache, queryMetadata, cacheConfig, fields, name, _isResponseInArrayMode, customResultMapper) {
        super({ sql: queryString, params }, cache, queryMetadata, cacheConfig);
        this.client = client;
        this.queryString = queryString;
        this.params = params;
        this.logger = logger;
        this.fields = fields;
        this._isResponseInArrayMode = _isResponseInArrayMode;
        this.customResultMapper = customResultMapper;
        this.rawQueryConfig = {
          name,
          text: queryString,
          types: {
            // @ts-ignore
            getTypeParser: (typeId, format) => {
              if (typeId === types.builtins.TIMESTAMPTZ) {
                return (val) => val;
              }
              if (typeId === types.builtins.TIMESTAMP) {
                return (val) => val;
              }
              if (typeId === types.builtins.DATE) {
                return (val) => val;
              }
              if (typeId === types.builtins.INTERVAL) {
                return (val) => val;
              }
              if (typeId === 1231) {
                return (val) => val;
              }
              if (typeId === 1115) {
                return (val) => val;
              }
              if (typeId === 1185) {
                return (val) => val;
              }
              if (typeId === 1187) {
                return (val) => val;
              }
              if (typeId === 1182) {
                return (val) => val;
              }
              return types.getTypeParser(typeId, format);
            }
          }
        };
        this.queryConfig = {
          name,
          text: queryString,
          rowMode: "array",
          types: {
            // @ts-ignore
            getTypeParser: (typeId, format) => {
              if (typeId === types.builtins.TIMESTAMPTZ) {
                return (val) => val;
              }
              if (typeId === types.builtins.TIMESTAMP) {
                return (val) => val;
              }
              if (typeId === types.builtins.DATE) {
                return (val) => val;
              }
              if (typeId === types.builtins.INTERVAL) {
                return (val) => val;
              }
              if (typeId === 1231) {
                return (val) => val;
              }
              if (typeId === 1115) {
                return (val) => val;
              }
              if (typeId === 1185) {
                return (val) => val;
              }
              if (typeId === 1187) {
                return (val) => val;
              }
              if (typeId === 1182) {
                return (val) => val;
              }
              return types.getTypeParser(typeId, format);
            }
          }
        };
      }
      static [import_entity.entityKind] = "NodePgPreparedQuery";
      rawQueryConfig;
      queryConfig;
      async execute(placeholderValues = {}) {
        return import_tracing.tracer.startActiveSpan("drizzle.execute", async () => {
          const params = (0, import_sql.fillPlaceholders)(this.params, placeholderValues);
          this.logger.logQuery(this.rawQueryConfig.text, params);
          const { fields, rawQueryConfig: rawQuery, client, queryConfig: query, joinsNotNullableMap, customResultMapper } = this;
          if (!fields && !customResultMapper) {
            return import_tracing.tracer.startActiveSpan("drizzle.driver.execute", async (span) => {
              span?.setAttributes({
                "drizzle.query.name": rawQuery.name,
                "drizzle.query.text": rawQuery.text,
                "drizzle.query.params": JSON.stringify(params)
              });
              return this.queryWithCache(rawQuery.text, params, async () => {
                return await client.query(rawQuery, params);
              });
            });
          }
          const result = await import_tracing.tracer.startActiveSpan("drizzle.driver.execute", (span) => {
            span?.setAttributes({
              "drizzle.query.name": query.name,
              "drizzle.query.text": query.text,
              "drizzle.query.params": JSON.stringify(params)
            });
            return this.queryWithCache(query.text, params, async () => {
              return await client.query(query, params);
            });
          });
          return import_tracing.tracer.startActiveSpan("drizzle.mapResponse", () => {
            return customResultMapper ? customResultMapper(result.rows) : result.rows.map((row) => (0, import_utils.mapResultRow)(fields, row, joinsNotNullableMap));
          });
        });
      }
      all(placeholderValues = {}) {
        return import_tracing.tracer.startActiveSpan("drizzle.execute", () => {
          const params = (0, import_sql.fillPlaceholders)(this.params, placeholderValues);
          this.logger.logQuery(this.rawQueryConfig.text, params);
          return import_tracing.tracer.startActiveSpan("drizzle.driver.execute", (span) => {
            span?.setAttributes({
              "drizzle.query.name": this.rawQueryConfig.name,
              "drizzle.query.text": this.rawQueryConfig.text,
              "drizzle.query.params": JSON.stringify(params)
            });
            return this.queryWithCache(this.rawQueryConfig.text, params, async () => {
              return this.client.query(this.rawQueryConfig, params);
            }).then((result) => result.rows);
          });
        });
      }
      /** @internal */
      isResponseInArrayMode() {
        return this._isResponseInArrayMode;
      }
    };
    var NodePgSession = class _NodePgSession extends import_session.PgSession {
      constructor(client, dialect, schema, options = {}) {
        super(dialect);
        this.client = client;
        this.schema = schema;
        this.options = options;
        this.logger = options.logger ?? new import_logger.NoopLogger();
        this.cache = options.cache ?? new import_core.NoopCache();
      }
      static [import_entity.entityKind] = "NodePgSession";
      logger;
      cache;
      prepareQuery(query, fields, name, isResponseInArrayMode, customResultMapper, queryMetadata, cacheConfig) {
        return new NodePgPreparedQuery(
          this.client,
          query.sql,
          query.params,
          this.logger,
          this.cache,
          queryMetadata,
          cacheConfig,
          fields,
          name,
          isResponseInArrayMode,
          customResultMapper
        );
      }
      async transaction(transaction, config) {
        const isPool = this.client instanceof Pool || Object.getPrototypeOf(this.client).constructor.name.includes("Pool");
        const session = isPool ? new _NodePgSession(await this.client.connect(), this.dialect, this.schema, this.options) : this;
        const tx = new NodePgTransaction(this.dialect, session, this.schema);
        await tx.execute(import_sql.sql`begin${config ? import_sql.sql` ${tx.getTransactionConfigSQL(config)}` : void 0}`);
        try {
          const result = await transaction(tx);
          await tx.execute(import_sql.sql`commit`);
          return result;
        } catch (error) {
          await tx.execute(import_sql.sql`rollback`);
          throw error;
        } finally {
          if (isPool) session.client.release();
        }
      }
      async count(sql2) {
        const res = await this.execute(sql2);
        return Number(
          res["rows"][0]["count"]
        );
      }
    };
    var NodePgTransaction = class _NodePgTransaction extends import_pg_core.PgTransaction {
      static [import_entity.entityKind] = "NodePgTransaction";
      async transaction(transaction) {
        const savepointName = `sp${this.nestedIndex + 1}`;
        const tx = new _NodePgTransaction(
          this.dialect,
          this.session,
          this.schema,
          this.nestedIndex + 1
        );
        await tx.execute(import_sql.sql.raw(`savepoint ${savepointName}`));
        try {
          const result = await transaction(tx);
          await tx.execute(import_sql.sql.raw(`release savepoint ${savepointName}`));
          return result;
        } catch (err) {
          await tx.execute(import_sql.sql.raw(`rollback to savepoint ${savepointName}`));
          throw err;
        }
      }
    };
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/node-postgres/driver.cjs
var require_driver = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/node-postgres/driver.cjs"(exports2, module2) {
    "use strict";
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var driver_exports = {};
    __export(driver_exports, {
      NodePgDatabase: () => NodePgDatabase,
      NodePgDriver: () => NodePgDriver,
      drizzle: () => drizzle
    });
    module2.exports = __toCommonJS(driver_exports);
    var import_pg = __toESM(require_lib2(), 1);
    var import_entity = require_entity();
    var import_logger = require_logger();
    var import_db = require_db();
    var import_dialect = require_dialect();
    var import_relations = require_relations();
    var import_utils = require_utils3();
    var import_session = require_session2();
    var NodePgDriver = class {
      constructor(client, dialect, options = {}) {
        this.client = client;
        this.dialect = dialect;
        this.options = options;
      }
      static [import_entity.entityKind] = "NodePgDriver";
      createSession(schema) {
        return new import_session.NodePgSession(this.client, this.dialect, schema, {
          logger: this.options.logger,
          cache: this.options.cache
        });
      }
    };
    var NodePgDatabase = class extends import_db.PgDatabase {
      static [import_entity.entityKind] = "NodePgDatabase";
    };
    function construct(client, config = {}) {
      const dialect = new import_dialect.PgDialect({ casing: config.casing });
      let logger;
      if (config.logger === true) {
        logger = new import_logger.DefaultLogger();
      } else if (config.logger !== false) {
        logger = config.logger;
      }
      let schema;
      if (config.schema) {
        const tablesConfig = (0, import_relations.extractTablesRelationalConfig)(
          config.schema,
          import_relations.createTableRelationsHelpers
        );
        schema = {
          fullSchema: config.schema,
          schema: tablesConfig.tables,
          tableNamesMap: tablesConfig.tableNamesMap
        };
      }
      const driver = new NodePgDriver(client, dialect, { logger, cache: config.cache });
      const session = driver.createSession(schema);
      const db = new NodePgDatabase(dialect, session, schema);
      db.$client = client;
      db.$cache = config.cache;
      if (db.$cache) {
        db.$cache["invalidate"] = config.cache?.onMutate;
      }
      return db;
    }
    function drizzle(...params) {
      if (typeof params[0] === "string") {
        const instance = new import_pg.default.Pool({
          connectionString: params[0]
        });
        return construct(instance, params[1]);
      }
      if ((0, import_utils.isConfig)(params[0])) {
        const { connection, client, ...drizzleConfig } = params[0];
        if (client) return construct(client, drizzleConfig);
        const instance = typeof connection === "string" ? new import_pg.default.Pool({
          connectionString: connection
        }) : new import_pg.default.Pool(connection);
        return construct(instance, drizzleConfig);
      }
      return construct(params[0], params[1]);
    }
    ((drizzle2) => {
      function mock(config) {
        return construct({}, config);
      }
      drizzle2.mock = mock;
    })(drizzle || (drizzle = {}));
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/node-postgres/index.cjs
var require_node_postgres = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/node-postgres/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var node_postgres_exports = {};
    module2.exports = __toCommonJS(node_postgres_exports);
    __reExport(node_postgres_exports, require_driver(), module2.exports);
    __reExport(node_postgres_exports, require_session2(), module2.exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/operations.cjs
var require_operations = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/operations.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var operations_exports = {};
    module2.exports = __toCommonJS(operations_exports);
  }
});

// node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/index.cjs
var require_drizzle_orm = __commonJS({
  "node_modules/.pnpm/drizzle-orm@0.45.2_@neondatabase+serverless@1.1.0_@types+pg@8.20.0_@upstash+redis@1.38.0_pg@8.22.0/node_modules/drizzle-orm/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var index_exports = {};
    module2.exports = __toCommonJS(index_exports);
    __reExport(index_exports, require_alias(), module2.exports);
    __reExport(index_exports, require_column_builder(), module2.exports);
    __reExport(index_exports, require_column(), module2.exports);
    __reExport(index_exports, require_entity(), module2.exports);
    __reExport(index_exports, require_errors(), module2.exports);
    __reExport(index_exports, require_logger(), module2.exports);
    __reExport(index_exports, require_operations(), module2.exports);
    __reExport(index_exports, require_query_promise(), module2.exports);
    __reExport(index_exports, require_relations(), module2.exports);
    __reExport(index_exports, require_sql2(), module2.exports);
    __reExport(index_exports, require_subquery(), module2.exports);
    __reExport(index_exports, require_table(), module2.exports);
    __reExport(index_exports, require_utils3(), module2.exports);
    __reExport(index_exports, require_view_common(), module2.exports);
  }
});

// apps/api/dist/db/schema.js
var require_schema2 = __commonJS({
  "apps/api/dist/db/schema.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.pollCommentsRelations = exports2.pollOptionsRelations = exports2.pollsRelations = exports2.usersRelations = exports2.pollComments = exports2.pollOptions = exports2.polls = exports2.users = void 0;
    var pg_core_1 = require_pg_core();
    var drizzle_orm_1 = require_drizzle_orm();
    exports2.users = (0, pg_core_1.pgTable)("users", {
      id: (0, pg_core_1.text)("id").primaryKey(),
      email: (0, pg_core_1.text)("email").notNull().unique(),
      passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
      salt: (0, pg_core_1.text)("salt").notNull(),
      nickname: (0, pg_core_1.text)("nickname").notNull(),
      createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
      isGuest: (0, pg_core_1.boolean)("is_guest").default(false).notNull()
    });
    exports2.polls = (0, pg_core_1.pgTable)("polls", {
      id: (0, pg_core_1.text)("id").primaryKey(),
      question: (0, pg_core_1.text)("question").notNull(),
      description: (0, pg_core_1.text)("description"),
      categoryId: (0, pg_core_1.text)("category_id"),
      createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
      endsAt: (0, pg_core_1.timestamp)("ends_at"),
      totalVotes: (0, pg_core_1.integer)("total_votes").default(0).notNull(),
      resultsVisibility: (0, pg_core_1.text)("results_visibility").default("afterVote").notNull(),
      creatorId: (0, pg_core_1.text)("creator_id"),
      creatorIsGuest: (0, pg_core_1.boolean)("creator_is_guest").default(true).notNull(),
      attachments: (0, pg_core_1.jsonb)("attachments").default([]).notNull()
    });
    exports2.pollOptions = (0, pg_core_1.pgTable)("poll_options", {
      id: (0, pg_core_1.serial)("id").primaryKey(),
      pollId: (0, pg_core_1.text)("poll_id").references(() => exports2.polls.id, { onDelete: "cascade" }).notNull(),
      optionIndex: (0, pg_core_1.integer)("option_index").notNull(),
      text: (0, pg_core_1.text)("text").notNull(),
      voteCount: (0, pg_core_1.integer)("vote_count").default(0).notNull(),
      imageUrl: (0, pg_core_1.text)("image_url")
    });
    exports2.pollComments = (0, pg_core_1.pgTable)("poll_comments", {
      id: (0, pg_core_1.serial)("id").primaryKey(),
      pollId: (0, pg_core_1.text)("poll_id").references(() => exports2.polls.id, { onDelete: "cascade" }).notNull(),
      voterName: (0, pg_core_1.text)("voter_name").default("\uC775\uBA85").notNull(),
      comment: (0, pg_core_1.text)("comment").notNull(),
      createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
      selectedOptionId: (0, pg_core_1.integer)("selected_option_id"),
      selectedOptionText: (0, pg_core_1.text)("selected_option_text")
    });
    exports2.usersRelations = (0, drizzle_orm_1.relations)(exports2.users, ({ many }) => ({
      polls: many(exports2.polls)
    }));
    exports2.pollsRelations = (0, drizzle_orm_1.relations)(exports2.polls, ({ one, many }) => ({
      creator: one(exports2.users, {
        fields: [exports2.polls.creatorId],
        references: [exports2.users.id]
      }),
      options: many(exports2.pollOptions),
      comments: many(exports2.pollComments)
    }));
    exports2.pollOptionsRelations = (0, drizzle_orm_1.relations)(exports2.pollOptions, ({ one }) => ({
      poll: one(exports2.polls, {
        fields: [exports2.pollOptions.pollId],
        references: [exports2.polls.id]
      })
    }));
    exports2.pollCommentsRelations = (0, drizzle_orm_1.relations)(exports2.pollComments, ({ one }) => ({
      poll: one(exports2.polls, {
        fields: [exports2.pollComments.pollId],
        references: [exports2.polls.id]
      })
    }));
  }
});

// apps/api/dist/db/index.js
var require_db2 = __commonJS({
  "apps/api/dist/db/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.db = exports2.pool = void 0;
    var node_postgres_1 = require_node_postgres();
    var pg_1 = require_lib2();
    var node_fs_1 = require("node:fs");
    var path = __importStar(require("node:path"));
    var schema = __importStar(require_schema2());
    if (!process.env.DATABASE_URL) {
      const envPaths = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(__dirname, "../../.env"),
        path.resolve(__dirname, "../../../.env.local")
      ];
      for (const envPath of envPaths) {
        if ((0, node_fs_1.existsSync)(envPath)) {
          try {
            process.loadEnvFile(envPath);
            if (process.env.DATABASE_URL) {
              break;
            }
          } catch {
          }
        }
      }
    }
    var databaseUrl = process.env.DATABASE_URL?.trim();
    var isLocalhost = databaseUrl?.includes("localhost") || databaseUrl?.includes("127.0.0.1");
    exports2.pool = new pg_1.Pool({
      connectionString: databaseUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 8,
      idleTimeoutMillis: 1e4,
      connectionTimeoutMillis: 5e3
    });
    exports2.db = (0, node_postgres_1.drizzle)(exports2.pool, { schema });
  }
});

// apps/api/dist/modules/database/database.service.js
var require_database_service = __commonJS({
  "apps/api/dist/modules/database/database.service.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseService = void 0;
    var common_1 = require("@nestjs/common");
    var fs = __importStar(require("node:fs"));
    var path = __importStar(require("node:path"));
    var blob_1 = require("@vercel/blob");
    var kv_1 = require("@vercel/kv");
    var pg_1 = require_lib2();
    var index_1 = require_db2();
    var schema = __importStar(require_schema2());
    var drizzle_orm_1 = require_drizzle_orm();
    var DatabaseService = class DatabaseService {
      storageKey = "picky:database:v1";
      blobPath = "picky/database/v1.json";
      filePath = path.resolve(process.env.PICKY_DB_PATH?.trim() || path.resolve(process.cwd(), "db.json"));
      useSqlDb = Boolean(process.env.DATABASE_URL?.trim());
      storageClient = this.createStorageClient();
      requiresDurableStorage = (process.env.NODE_ENV === "production" || process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV)) && process.env.PICKY_ALLOW_EPHEMERAL_STORAGE !== "true";
      data = { polls: [], users: [] };
      initialized = false;
      async onModuleInit() {
        if (this.useSqlDb) {
          try {
            await index_1.pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            nickname TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            is_guest BOOLEAN DEFAULT FALSE NOT NULL
          );
        `);
            await index_1.pool.query(`
          CREATE TABLE IF NOT EXISTS polls (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            ends_at TIMESTAMP,
            total_votes INTEGER DEFAULT 0 NOT NULL,
            results_visibility TEXT DEFAULT 'afterVote' NOT NULL,
            creator_id TEXT,
            creator_is_guest BOOLEAN DEFAULT TRUE NOT NULL,
            attachments JSONB DEFAULT '[]'::jsonb NOT NULL
          );
        `);
            await index_1.pool.query(`
          CREATE TABLE IF NOT EXISTS poll_options (
            id SERIAL PRIMARY KEY,
            poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
            option_index INTEGER NOT NULL,
            text TEXT NOT NULL,
            vote_count INTEGER DEFAULT 0 NOT NULL,
            image_url TEXT
          );
        `);
            await index_1.pool.query(`
          CREATE TABLE IF NOT EXISTS poll_comments (
            id SERIAL PRIMARY KEY,
            poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
            voter_name TEXT DEFAULT '\uC775\uBA85' NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            selected_option_id INTEGER,
            selected_option_text TEXT
          );
        `);
            console.log("\u2713 Drizzle PostgreSQL database tables verified/created successfully.");
          } catch (err) {
            console.error("Failed to initialize Drizzle tables in PostgreSQL:", err);
          }
          this.initialized = true;
          return;
        }
        try {
          await this.load();
        } catch (error) {
          if (this.requiresDurableStorage) {
            console.error("Durable storage is not ready. Requests will fail until it is configured.");
            return;
          }
          throw error;
        }
      }
      createStorageClient() {
        return this.createPostgresStorageClient() || this.createKvStorageClient() || this.createBlobStorageClient();
      }
      createPostgresStorageClient() {
        const databaseUrl = process.env.DATABASE_URL?.trim();
        if (!databaseUrl) {
          return null;
        }
        try {
          const isLocalhost = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
          const pool = new pg_1.Pool({
            connectionString: databaseUrl,
            ssl: isLocalhost ? false : { rejectUnauthorized: false },
            max: 8,
            idleTimeoutMillis: 1e4,
            connectionTimeoutMillis: 5e3
          });
          return {
            get: async (key) => {
              try {
                await pool.query(`
              CREATE TABLE IF NOT EXISTS picky_storage (
                key VARCHAR(255) PRIMARY KEY,
                value JSONB NOT NULL
              );
            `);
                const res = await pool.query("SELECT value FROM picky_storage WHERE key = $1", [key]);
                if (res.rows.length === 0) {
                  return null;
                }
                return res.rows[0].value;
              } catch (error) {
                console.error("Failed to read from PostgreSQL database:", error);
                return null;
              }
            },
            set: async (key, value) => {
              try {
                await pool.query(`
              CREATE TABLE IF NOT EXISTS picky_storage (
                key VARCHAR(255) PRIMARY KEY,
                value JSONB NOT NULL
              );
            `);
                await pool.query(`
              INSERT INTO picky_storage (key, value)
              VALUES ($1, $2)
              ON CONFLICT (key) DO UPDATE
              SET value = EXCLUDED.value
            `, [key, JSON.stringify(value)]);
                return true;
              } catch (error) {
                console.error("Failed to write to PostgreSQL database:", error);
                throw error;
              }
            }
          };
        } catch (error) {
          console.error("Failed to initialize PostgreSQL connection pool:", error);
          return null;
        }
      }
      createKvStorageClient() {
        const url = process.env.KV_REST_API_URL?.trim();
        const token = process.env.KV_REST_API_TOKEN?.trim();
        if (!url || !token) {
          return null;
        }
        try {
          return (0, kv_1.createClient)({ url, token });
        } catch {
          return null;
        }
      }
      createBlobStorageClient() {
        const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
        const hasOidcStore = Boolean(process.env.VERCEL_OIDC_TOKEN?.trim() && process.env.BLOB_STORE_ID?.trim());
        if (!hasReadWriteToken && !hasOidcStore) {
          return null;
        }
        return {
          get: async (_key) => {
            const result = await (0, blob_1.get)(this.blobPath, { access: "private", useCache: false });
            if (result?.statusCode !== 200 || !result.stream) {
              return null;
            }
            const text = await new Response(result.stream).text();
            if (!text.trim()) {
              return null;
            }
            return JSON.parse(text);
          },
          set: async (_key, value) => {
            return (0, blob_1.put)(this.blobPath, JSON.stringify(value), {
              access: "private",
              allowOverwrite: true,
              contentType: "application/json",
              cacheControlMaxAge: 60
            });
          }
        };
      }
      createSeedData() {
        return {
          polls: [
            {
              id: "seed-onboarding-poll",
              question: "WebstormProjects \uAC1C\uC778 \uD504\uB85C\uC81D\uD2B8\uB4E4 \uC911 \uC5B4\uB5A4 \uAC83\uC744 \uAC00\uC7A5 \uBA3C\uC800 \uC0C1\uC6A9 \uC11C\uBE44\uC2A4\uD654 \uC2DC\uD0AC\uAE4C\uC694?",
              description: "\uC77C\uC0C1\uC5D0\uC11C \uACE0\uBBFC\uB418\uB294 \uAC83\uB4E4\uC744 \uC9C0\uC778\uB4E4\uC5D0\uAC8C \uC27D\uAC8C \uBB3C\uC5B4\uBCF4\uB294 picky(\uD53C\uD0A4) \uC11C\uBE44\uC2A4 \uCD9C\uC2DC\uB97C \uCD95\uD558\uD558\uBA70, \uB2E4\uC74C \uAC1C\uC778 \uD504\uB85C\uC81D\uD2B8 \uC911 \uD558\uB098\uB97C \uC0C1\uC6A9 \uB7F0\uCE6D\uD558\uACE0 \uC2F6\uC2B5\uB2C8\uB2E4. \uC5EC\uB7EC\uBD84\uC758 \uC120\uD0DD\uC740?",
              options: [
                {
                  id: 1,
                  text: "PromptMarket (\uD504\uB86C\uD504\uD2B8/\uC5D0\uC774\uC804\uD2B8 \uB9C8\uCF13)",
                  voteCount: 15,
                  imageUrl: null
                },
                {
                  id: 2,
                  text: "proto-live (\uBC14\uC774\uBE0C\uCF54\uB529 \uCF54\uB4DC \uACF5\uC720 \uD50C\uB7AB\uD3FC)",
                  voteCount: 12,
                  imageUrl: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&q=80"
                },
                {
                  id: 3,
                  text: "family-care-platform (\uC2E4\uBC84 \uCF00\uC5B4 \uB9E4\uCE6D \uC11C\uBE44\uC2A4)",
                  voteCount: 8,
                  imageUrl: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&q=80"
                },
                {
                  id: 4,
                  text: "orbit-ui (\uC720\uB824\uD55C \uAE00\uB77C\uC2A4\uBAA8\uD53C\uC998 \uCEF4\uD3EC\uB10C\uD2B8 \uD0B7)",
                  voteCount: 19,
                  imageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&q=80"
                }
              ],
              comments: [
                {
                  id: 1,
                  voterName: "\uC2DC\uB2C8\uC5B4FE",
                  comment: "PromptMarket\uC774 \uC694\uC998 AI \uD2B8\uB80C\uB4DC\uC5D0 \uAC00\uC7A5 \uC815\uD569\uD574\uC11C \uBE44\uC988\uB2C8\uC2A4 \uC7A0\uC7AC\uB825\uC774 \uD07D\uB2C8\uB2E4!",
                  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                  selectedOptionId: 1,
                  selectedOptionText: "PromptMarket (\uD504\uB86C\uD504\uD2B8/\uC5D0\uC774\uC804\uD2B8 \uB9C8\uCF13)"
                },
                {
                  id: 2,
                  voterName: "\uAE40\uD76C\uC900",
                  comment: "\uC5ED\uC2DC Orbit UI \uAC00 \uC720\uB824\uD55C \uCEF4\uD3EC\uB10C\uD2B8 \uD0B7\uC774\uB77C \uB514\uC790\uC774\uB108\uB4E4\uC5D0\uAC8C \uC778\uAE30\uAC00 \uB9CE\uC744 \uAC83 \uAC19\uB124\uC694.",
                  createdAt: (/* @__PURE__ */ new Date()).toISOString(),
                  selectedOptionId: 4,
                  selectedOptionText: "orbit-ui (\uC720\uB824\uD55C \uAE00\uB77C\uC2A4\uBAA8\uD53C\uC998 \uCEF4\uD3EC\uB10C\uD2B8 \uD0B7)"
                }
              ],
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              totalVotes: 54
            }
          ],
          users: []
        };
      }
      sanitizeEmails(value) {
        return (value || "").trim().toLowerCase();
      }
      sanitizeData(candidate) {
        const raw = candidate;
        const polls = Array.isArray(raw?.polls) ? raw?.polls : [];
        const users = Array.isArray(raw?.users) ? raw.users.filter((user) => user && typeof user.id === "string" && typeof user.email === "string").map((user) => ({
          id: String(user.id),
          email: String(user.email || ""),
          passwordHash: String(user.passwordHash || ""),
          salt: String(user.salt || ""),
          nickname: String(user.nickname || ""),
          createdAt: String(user.createdAt || (/* @__PURE__ */ new Date()).toISOString()),
          isGuest: Boolean(user.isGuest)
        })) : [];
        return {
          polls: polls.filter((poll) => poll && typeof poll.id === "string" && typeof poll.question === "string").map((poll) => ({
            ...poll,
            options: Array.isArray(poll.options) ? poll.options : [],
            comments: Array.isArray(poll.comments) ? poll.comments : [],
            createdAt: String(poll.createdAt || (/* @__PURE__ */ new Date()).toISOString()),
            totalVotes: typeof poll.totalVotes === "number" ? poll.totalVotes : Number(poll.totalVotes) || 0
          })),
          users: users.map((user) => ({
            ...user,
            email: this.sanitizeEmails(user.email)
          }))
        };
      }
      async loadFromKv() {
        if (!this.storageClient) {
          return null;
        }
        const raw = await this.storageClient.get(this.storageKey);
        if (!raw) {
          return null;
        }
        return this.sanitizeData(raw);
      }
      loadFromFile() {
        try {
          if (!fs.existsSync(this.filePath)) {
            return this.createSeedData();
          }
          const fileContent = fs.readFileSync(this.filePath, "utf-8");
          const parsed = JSON.parse(fileContent);
          const next = this.sanitizeData(parsed);
          if (next.polls.length === 0 && next.users.length === 0) {
            return this.createSeedData();
          }
          return next;
        } catch (error) {
          console.error("Failed to load JSON database, fallback seed initialized.", error);
          return this.createSeedData();
        }
      }
      async saveToKv(nextState) {
        if (!this.storageClient) {
          return;
        }
        await this.storageClient.set(this.storageKey, nextState);
      }
      saveToFile(nextState) {
        try {
          fs.writeFileSync(this.filePath, JSON.stringify(nextState, null, 2), "utf-8");
        } catch (error) {
          console.error("Failed to save JSON database:", error);
        }
      }
      async persist(nextState) {
        if (this.storageClient) {
          try {
            await this.saveToKv(nextState);
            return;
          } catch (error) {
            console.error("Failed to persist with KV.", error);
            if (this.requiresDurableStorage) {
              throw new common_1.ServiceUnavailableException("\uC601\uC18D \uC800\uC7A5\uC18C\uC5D0 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. Vercel Blob/KV \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
            }
          }
        }
        if (this.requiresDurableStorage) {
          throw new common_1.ServiceUnavailableException("Production\uC5D0\uB294 \uC601\uC18D \uC800\uC7A5\uC18C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. BLOB_READ_WRITE_TOKEN \uB610\uB294 KV_REST_API_URL/KV_REST_API_TOKEN\uC744 \uC124\uC815\uD574 \uC8FC\uC138\uC694.");
        }
        this.saveToFile(nextState);
      }
      async load() {
        if (this.initialized) {
          return;
        }
        if (this.requiresDurableStorage && !this.storageClient) {
          throw new common_1.ServiceUnavailableException("Production\uC5D0\uB294 \uC601\uC18D \uC800\uC7A5\uC18C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. BLOB_READ_WRITE_TOKEN \uB610\uB294 KV_REST_API_URL/KV_REST_API_TOKEN\uC744 \uC124\uC815\uD574 \uC8FC\uC138\uC694.");
        }
        try {
          const loaded = await this.loadFromKv();
          if (loaded) {
            this.data = loaded;
          } else {
            this.data = this.loadFromFile();
            if (this.requiresDurableStorage && this.storageClient) {
              await this.saveToKv(this.data);
            }
          }
        } catch (error) {
          console.error("Failed to initialize database.", error);
          if (this.requiresDurableStorage) {
            throw new common_1.ServiceUnavailableException("\uC601\uC18D \uC800\uC7A5\uC18C\uB97C \uCD08\uAE30\uD654\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. Vercel Blob/KV \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
          }
          this.data = this.loadFromFile();
        }
        this.initialized = true;
      }
      async sync() {
        if (this.storageClient) {
          try {
            const latest = await this.loadFromKv();
            if (latest) {
              this.data = latest;
              return;
            }
          } catch (error) {
            if (this.requiresDurableStorage) {
              console.error("Failed to sync durable storage.", error);
              throw new common_1.ServiceUnavailableException("\uC601\uC18D \uC800\uC7A5\uC18C\uC640 \uB3D9\uAE30\uD654\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. Vercel Blob/KV \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.");
            }
          }
        }
        if (this.requiresDurableStorage) {
          throw new common_1.ServiceUnavailableException("Production\uC5D0\uB294 \uC601\uC18D \uC800\uC7A5\uC18C\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. BLOB_READ_WRITE_TOKEN \uB610\uB294 KV_REST_API_URL/KV_REST_API_TOKEN\uC744 \uC124\uC815\uD574 \uC8FC\uC138\uC694.");
        }
      }
      async refresh() {
        await this.load();
        await this.sync();
      }
      async commit(nextState) {
        await this.persist(nextState);
        this.data = nextState;
      }
      async getPolls() {
        if (this.useSqlDb) {
          const rows = await index_1.db.query.polls.findMany({
            orderBy: [(0, drizzle_orm_1.desc)(schema.polls.createdAt)],
            with: {
              options: {
                orderBy: (opt, { asc }) => [asc(opt.optionIndex)]
              },
              comments: {
                orderBy: (cmt, { asc }) => [asc(cmt.createdAt)]
              }
            }
          });
          return rows.map((r) => ({
            id: r.id,
            question: r.question,
            description: r.description,
            createdAt: r.createdAt.toISOString(),
            endsAt: r.endsAt ? r.endsAt.toISOString() : null,
            totalVotes: r.totalVotes,
            resultsVisibility: r.resultsVisibility,
            creatorId: r.creatorId,
            creatorIsGuest: r.creatorIsGuest,
            categoryId: r.categoryId,
            attachments: r.attachments,
            options: r.options.map((o) => ({
              id: o.optionIndex,
              text: o.text,
              voteCount: o.voteCount,
              imageUrl: o.imageUrl
            })),
            comments: r.comments.map((c) => ({
              id: c.id,
              voterName: c.voterName,
              comment: c.comment,
              createdAt: c.createdAt.toISOString(),
              selectedOptionId: c.selectedOptionId || void 0,
              selectedOptionText: c.selectedOptionText || void 0
            }))
          }));
        }
        await this.refresh();
        return [...this.data.polls];
      }
      async getPollById(id) {
        if (this.useSqlDb) {
          const r = await index_1.db.query.polls.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.polls.id, id),
            with: {
              options: {
                orderBy: (opt, { asc }) => [asc(opt.optionIndex)]
              },
              comments: {
                orderBy: (cmt, { asc }) => [asc(cmt.createdAt)]
              }
            }
          });
          if (!r)
            return void 0;
          return {
            id: r.id,
            question: r.question,
            description: r.description,
            createdAt: r.createdAt.toISOString(),
            endsAt: r.endsAt ? r.endsAt.toISOString() : null,
            totalVotes: r.totalVotes,
            resultsVisibility: r.resultsVisibility,
            creatorId: r.creatorId,
            creatorIsGuest: r.creatorIsGuest,
            categoryId: r.categoryId,
            attachments: r.attachments,
            options: r.options.map((o) => ({
              id: o.optionIndex,
              text: o.text,
              voteCount: o.voteCount,
              imageUrl: o.imageUrl
            })),
            comments: r.comments.map((c) => ({
              id: c.id,
              voterName: c.voterName,
              comment: c.comment,
              createdAt: c.createdAt.toISOString(),
              selectedOptionId: c.selectedOptionId || void 0,
              selectedOptionText: c.selectedOptionText || void 0
            }))
          };
        }
        await this.refresh();
        return this.data.polls.find((p) => p.id === id);
      }
      async createPoll(poll) {
        if (this.useSqlDb) {
          await index_1.db.insert(schema.polls).values({
            id: poll.id,
            question: poll.question,
            description: poll.description,
            createdAt: new Date(poll.createdAt),
            endsAt: poll.endsAt ? new Date(poll.endsAt) : null,
            totalVotes: poll.totalVotes,
            resultsVisibility: poll.resultsVisibility || "afterVote",
            creatorId: poll.creatorId,
            creatorIsGuest: poll.creatorIsGuest ?? true,
            categoryId: poll.categoryId ?? null,
            attachments: poll.attachments
          });
          if (poll.options && poll.options.length > 0) {
            await index_1.db.insert(schema.pollOptions).values(poll.options.map((opt) => ({
              pollId: poll.id,
              optionIndex: opt.id,
              text: opt.text,
              voteCount: opt.voteCount,
              imageUrl: opt.imageUrl
            })));
          }
          return;
        }
        await this.refresh();
        const next = {
          ...this.data,
          polls: [poll, ...this.data.polls]
        };
        await this.commit(next);
      }
      async updatePoll(poll) {
        if (this.useSqlDb) {
          await index_1.db.update(schema.polls).set({
            totalVotes: poll.totalVotes
          }).where((0, drizzle_orm_1.eq)(schema.polls.id, poll.id));
          for (const opt of poll.options) {
            await index_1.db.update(schema.pollOptions).set({
              voteCount: opt.voteCount
            }).where((0, drizzle_orm_1.sql)`${schema.pollOptions.pollId} = ${poll.id} AND ${schema.pollOptions.optionIndex} = ${opt.id}`);
          }
          const existingComments = await index_1.db.select({ id: schema.pollComments.id }).from(schema.pollComments).where((0, drizzle_orm_1.eq)(schema.pollComments.pollId, poll.id));
          const existingIds = new Set(existingComments.map((c) => c.id));
          const newComments = poll.comments.filter((c) => !existingIds.has(c.id));
          if (newComments.length > 0) {
            await index_1.db.insert(schema.pollComments).values(newComments.map((c) => ({
              pollId: poll.id,
              voterName: c.voterName,
              comment: c.comment,
              createdAt: new Date(c.createdAt),
              selectedOptionId: c.selectedOptionId || null,
              selectedOptionText: c.selectedOptionText || null
            })));
          }
          return;
        }
        await this.refresh();
        const nextPolls = [...this.data.polls];
        const idx = nextPolls.findIndex((p) => p.id === poll.id);
        if (idx === -1) {
          return;
        }
        nextPolls[idx] = poll;
        await this.commit({ ...this.data, polls: nextPolls });
      }
      async deletePoll(id) {
        if (this.useSqlDb) {
          await index_1.db.delete(schema.polls).where((0, drizzle_orm_1.eq)(schema.polls.id, id));
          return true;
        }
        await this.refresh();
        const exists = this.data.polls.some((p) => p.id === id);
        if (!exists) {
          return false;
        }
        const nextPolls = this.data.polls.filter((p) => p.id !== id);
        await this.commit({ ...this.data, polls: nextPolls });
        return true;
      }
      async savePollContent(poll, options) {
        if (this.useSqlDb) {
          await index_1.db.update(schema.polls).set({
            question: poll.question,
            description: poll.description ?? null,
            endsAt: poll.endsAt ? new Date(poll.endsAt) : null,
            resultsVisibility: poll.resultsVisibility || "afterVote",
            categoryId: poll.categoryId ?? null,
            totalVotes: poll.totalVotes,
            attachments: poll.attachments ?? []
          }).where((0, drizzle_orm_1.eq)(schema.polls.id, poll.id));
          if (options.optionsStructurallyChanged) {
            await index_1.db.delete(schema.pollOptions).where((0, drizzle_orm_1.eq)(schema.pollOptions.pollId, poll.id));
            if (poll.options.length > 0) {
              await index_1.db.insert(schema.pollOptions).values(poll.options.map((opt) => ({
                pollId: poll.id,
                optionIndex: opt.id,
                text: opt.text,
                voteCount: opt.voteCount,
                imageUrl: opt.imageUrl
              })));
            }
          } else {
            for (const opt of poll.options) {
              await index_1.db.update(schema.pollOptions).set({ text: opt.text, imageUrl: opt.imageUrl }).where((0, drizzle_orm_1.sql)`${schema.pollOptions.pollId} = ${poll.id} AND ${schema.pollOptions.optionIndex} = ${opt.id}`);
            }
          }
          return;
        }
        await this.refresh();
        const nextPolls = [...this.data.polls];
        const idx = nextPolls.findIndex((p) => p.id === poll.id);
        if (idx === -1) {
          return;
        }
        nextPolls[idx] = poll;
        await this.commit({ ...this.data, polls: nextPolls });
      }
      async deleteComment(pollId, commentId) {
        if (this.useSqlDb) {
          await index_1.db.delete(schema.pollComments).where((0, drizzle_orm_1.sql)`${schema.pollComments.pollId} = ${pollId} AND ${schema.pollComments.id} = ${commentId}`);
          return true;
        }
        await this.refresh();
        const nextPolls = this.data.polls.map((p) => p.id === pollId ? { ...p, comments: p.comments.filter((comment) => comment.id !== commentId) } : p);
        await this.commit({ ...this.data, polls: nextPolls });
        return true;
      }
      async getUsers() {
        if (this.useSqlDb) {
          const rows = await index_1.db.select().from(schema.users);
          return rows.map((u) => ({
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            salt: u.salt,
            nickname: u.nickname,
            createdAt: u.createdAt.toISOString(),
            isGuest: u.isGuest
          }));
        }
        await this.refresh();
        return [...this.data.users];
      }
      async getUserByEmail(email) {
        if (this.useSqlDb) {
          const target2 = this.sanitizeEmails(email);
          const rows = await index_1.db.select().from(schema.users).where((0, drizzle_orm_1.eq)(schema.users.email, target2)).limit(1);
          const u = rows[0];
          if (!u)
            return void 0;
          return {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            salt: u.salt,
            nickname: u.nickname,
            createdAt: u.createdAt.toISOString(),
            isGuest: u.isGuest
          };
        }
        const target = this.sanitizeEmails(email);
        await this.refresh();
        return this.data.users.find((u) => this.sanitizeEmails(u.email) === target);
      }
      async getUserById(id) {
        if (this.useSqlDb) {
          const rows = await index_1.db.select().from(schema.users).where((0, drizzle_orm_1.eq)(schema.users.id, id)).limit(1);
          const u = rows[0];
          if (!u)
            return void 0;
          return {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            salt: u.salt,
            nickname: u.nickname,
            createdAt: u.createdAt.toISOString(),
            isGuest: u.isGuest
          };
        }
        await this.refresh();
        return this.data.users.find((u) => u.id === id);
      }
      async createUser(user) {
        if (this.useSqlDb) {
          await index_1.db.insert(schema.users).values({
            id: user.id,
            email: this.sanitizeEmails(user.email),
            passwordHash: user.passwordHash,
            salt: user.salt,
            nickname: user.nickname,
            createdAt: new Date(user.createdAt),
            isGuest: user.isGuest
          });
          return;
        }
        await this.refresh();
        const next = {
          ...this.data,
          users: [...this.data.users, user]
        };
        await this.commit(next);
      }
    };
    exports2.DatabaseService = DatabaseService;
    exports2.DatabaseService = DatabaseService = __decorate([
      (0, common_1.Injectable)()
    ], DatabaseService);
  }
});

// apps/api/dist/modules/database/database.module.js
var require_database_module = __commonJS({
  "apps/api/dist/modules/database/database.module.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseModule = void 0;
    var common_1 = require("@nestjs/common");
    var database_service_1 = require_database_service();
    var DatabaseModule = class DatabaseModule {
    };
    exports2.DatabaseModule = DatabaseModule;
    exports2.DatabaseModule = DatabaseModule = __decorate([
      (0, common_1.Global)(),
      (0, common_1.Module)({
        providers: [database_service_1.DatabaseService],
        exports: [database_service_1.DatabaseService]
      })
    ], DatabaseModule);
  }
});

// apps/api/dist/modules/auth/admin.js
var require_admin = __commonJS({
  "apps/api/dist/modules/auth/admin.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isAdminEmail = exports2.getAdminEmails = void 0;
    var DEFAULT_ADMIN_EMAILS = ["blue45f@gmail.com"];
    var normalizeEmail = (value) => (typeof value === "string" ? value : "").trim().toLowerCase();
    var getAdminEmails = () => {
      const raw = process.env.ADMIN_EMAILS?.trim();
      if (!raw) {
        return DEFAULT_ADMIN_EMAILS;
      }
      const parsed = raw.split(",").map((entry) => normalizeEmail(entry)).filter(Boolean);
      return parsed.length > 0 ? parsed : DEFAULT_ADMIN_EMAILS;
    };
    exports2.getAdminEmails = getAdminEmails;
    var isAdminEmail = (email) => {
      const normalized = normalizeEmail(email);
      if (!normalized) {
        return false;
      }
      return (0, exports2.getAdminEmails)().includes(normalized);
    };
    exports2.isAdminEmail = isAdminEmail;
  }
});

// apps/api/dist/modules/auth/auth.service.js
var require_auth_service = __commonJS({
  "apps/api/dist/modules/auth/auth.service.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __importStar = exports2 && exports2.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AuthService = void 0;
    var common_1 = require("@nestjs/common");
    var jwt_1 = require("@nestjs/jwt");
    var crypto2 = __importStar(require("node:crypto"));
    var https = __importStar(require("node:https"));
    var fs = __importStar(require("node:fs"));
    var database_service_1 = require_database_service();
    var admin_1 = require_admin();
    var APPS_IN_TOSS_API_BASE = "https://apps-in-toss-api.toss.im";
    var AuthService = class AuthService {
      db;
      jwtService;
      constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
      }
      hashPassword(password, salt) {
        return crypto2.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
      }
      generateSalt() {
        return crypto2.randomBytes(16).toString("hex");
      }
      async signPayload(payload) {
        return this.jwtService.signAsync(payload);
      }
      toProfile(user) {
        return {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          createdAt: user.createdAt,
          isGuest: user.isGuest,
          isAdmin: (0, admin_1.isAdminEmail)(user.email)
        };
      }
      async register(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const normalizedNickname = input.nickname.trim();
        const existing = await this.db.getUserByEmail(normalizedEmail);
        if (existing) {
          throw new common_1.BadRequestException("\uC774\uBBF8 \uB4F1\uB85D\uB41C \uC774\uBA54\uC77C \uC8FC\uC18C\uC785\uB2C8\uB2E4.");
        }
        const salt = this.generateSalt();
        const passwordHash = this.hashPassword(input.password, salt);
        const userId = crypto2.randomUUID();
        const newUser = {
          id: userId,
          email: normalizedEmail,
          passwordHash,
          salt,
          nickname: normalizedNickname,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          isGuest: false
        };
        await this.db.createUser(newUser);
        const accessToken = await this.signPayload({
          sub: newUser.id,
          email: newUser.email,
          nickname: newUser.nickname,
          isGuest: false
        });
        return {
          accessToken,
          user: this.toProfile(newUser)
        };
      }
      async registerGuest(input) {
        const normalizedNickname = input.nickname.trim();
        const userId = `guest-${crypto2.randomUUID()}`;
        const guestUser = {
          id: userId,
          email: "",
          passwordHash: "",
          salt: "",
          nickname: normalizedNickname,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          isGuest: true
        };
        await this.db.createUser(guestUser);
        const accessToken = await this.signPayload({
          sub: guestUser.id,
          email: guestUser.email,
          nickname: guestUser.nickname,
          isGuest: true
        });
        return {
          accessToken,
          user: this.toProfile(guestUser)
        };
      }
      async login(input) {
        const normalizedEmail = input.email.trim().toLowerCase();
        const user = await this.db.getUserByEmail(normalizedEmail);
        if (!user || user.isGuest) {
          throw new common_1.UnauthorizedException("\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
        }
        const hash = this.hashPassword(input.password, user.salt);
        if (hash !== user.passwordHash) {
          throw new common_1.UnauthorizedException("\uC774\uBA54\uC77C \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
        }
        const accessToken = await this.signPayload({
          sub: user.id,
          email: user.email,
          nickname: user.nickname,
          isGuest: false
        });
        return {
          accessToken,
          user: this.toProfile(user)
        };
      }
      async loginWithTossIdentity(input) {
        const fingerprint = crypto2.createHash("sha256").update(input.anonymousKey).digest("hex").slice(0, 32);
        const userId = `toss-${fingerprint}`;
        const nickname = (input.nickname?.trim() || "\uD1A0\uC2A4 \uC0AC\uC6A9\uC790").slice(0, 20);
        let user = await this.db.getUserById(userId);
        if (!user) {
          user = {
            id: userId,
            email: "",
            passwordHash: "",
            salt: "",
            nickname,
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            isGuest: false
          };
          await this.db.createUser(user);
        }
        const accessToken = await this.signPayload({
          sub: user.id,
          email: user.email,
          nickname: user.nickname,
          isGuest: user.isGuest
        });
        return { accessToken, user: this.toProfile(user) };
      }
      async loginWithTossAuthCode(input) {
        const agent = this.createMtlsAgent();
        const tokenResponse = await this.requestTossApi("POST", "/api-partner/v1/apps-in-toss/user/oauth2/generate-token", agent, {
          body: { authorizationCode: input.authorizationCode, referrer: input.referrer ?? "DEFAULT" }
        });
        const tossAccessToken = tokenResponse?.success?.accessToken;
        if (!tossAccessToken) {
          throw new common_1.UnauthorizedException("\uD1A0\uC2A4 \uB85C\uADF8\uC778 \uD1A0\uD070 \uBC1C\uAE09\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694.");
        }
        const meResponse = await this.requestTossApi("GET", "/api-partner/v1/apps-in-toss/user/oauth2/login-me", agent, {
          bearer: tossAccessToken
        });
        const userKey = meResponse?.success?.userKey;
        if (userKey == null) {
          throw new common_1.UnauthorizedException("\uD1A0\uC2A4 \uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uAC00\uC838\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.");
        }
        const userId = `toss-user-${userKey}`;
        let user = await this.db.getUserById(userId);
        if (!user) {
          user = {
            id: userId,
            email: "",
            passwordHash: "",
            salt: "",
            nickname: "\uD1A0\uC2A4 \uC0AC\uC6A9\uC790",
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            isGuest: false
          };
          await this.db.createUser(user);
        }
        const accessToken = await this.signPayload({
          sub: user.id,
          email: user.email,
          nickname: user.nickname,
          isGuest: user.isGuest
        });
        return { accessToken, user: this.toProfile(user) };
      }
      createMtlsAgent() {
        const certPath = process.env.APPS_IN_TOSS_MTLS_CERT_PATH?.trim();
        const keyPath = process.env.APPS_IN_TOSS_MTLS_KEY_PATH?.trim();
        if (!certPath || !keyPath) {
          throw new common_1.ServiceUnavailableException("\uD1A0\uC2A4 \uB85C\uADF8\uC778(\uC11C\uBC84 mTLS) \uC778\uC99D\uC11C\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694. \uCF58\uC194\uC5D0\uC11C mTLS \uC778\uC99D\uC11C\uB97C \uBC1C\uAE09\uD574 APPS_IN_TOSS_MTLS_CERT_PATH/KEY_PATH \uD658\uACBD\uBCC0\uC218\uC5D0 \uC124\uC815\uD558\uAC70\uB098, getAnonymousKey \uAE30\uBC18 \uC2DD\uBCC4 \uB85C\uADF8\uC778\uC744 \uC0AC\uC6A9\uD574 \uC8FC\uC138\uC694.");
        }
        return new https.Agent({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) });
      }
      requestTossApi(method, path, agent, options = {}) {
        return new Promise((resolve, reject) => {
          const url = new URL(`${APPS_IN_TOSS_API_BASE}${path}`);
          const payload = options.body == null ? void 0 : JSON.stringify(options.body);
          const request = https.request(url, {
            method,
            agent,
            headers: {
              "Content-Type": "application/json",
              ...options.bearer ? { Authorization: `Bearer ${options.bearer}` } : {},
              ...payload ? { "Content-Length": Buffer.byteLength(payload) } : {}
            }
          }, (response) => {
            let raw = "";
            response.on("data", (chunk) => {
              raw += chunk;
            });
            response.on("end", () => {
              try {
                resolve(raw ? JSON.parse(raw) : {});
              } catch {
                reject(new common_1.UnauthorizedException("\uD1A0\uC2A4 API \uC751\uB2F5\uC744 \uD574\uC11D\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694."));
              }
            });
          });
          request.on("error", (error) => reject(error));
          if (payload) {
            request.write(payload);
          }
          request.end();
        });
      }
      async validateUser(payload) {
        if (!payload?.sub || typeof payload?.sub !== "string") {
          throw new common_1.UnauthorizedException("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4.");
        }
        if (payload.isGuest === void 0 || typeof payload.nickname !== "string" || typeof payload.email !== "string") {
          const user = await this.db.getUserById(payload.sub);
          if (!user) {
            throw new common_1.UnauthorizedException("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4.");
          }
          return this.toProfile(user);
        }
        return {
          id: payload.sub,
          email: payload.email,
          nickname: payload.nickname,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          isGuest: payload.isGuest,
          isAdmin: (0, admin_1.isAdminEmail)(payload.email)
        };
      }
    };
    exports2.AuthService = AuthService;
    exports2.AuthService = AuthService = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [
        database_service_1.DatabaseService,
        jwt_1.JwtService
      ])
    ], AuthService);
  }
});

// packages/shared/dist/index.cjs
var require_dist2 = __commonJS({
  "packages/shared/dist/index.cjs"(exports2, module2) {
    "use strict";
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var index_exports = {};
    __export(index_exports, {
      CreatePollSchema: () => CreatePollSchema,
      GuestRegisterSchema: () => GuestRegisterSchema,
      LoginSchema: () => LoginSchema,
      MASCOT: () => MASCOT,
      MASCOT_EMOJI: () => MASCOT_EMOJI,
      MASCOT_NAME: () => MASCOT_NAME,
      POLL_CATEGORIES: () => POLL_CATEGORIES,
      PollAttachmentSchema: () => PollAttachmentSchema,
      PollResultsVisibilitySchema: () => PollResultsVisibilitySchema,
      RADIUS: () => RADIUS,
      RegisterSchema: () => RegisterSchema,
      TossIdentitySchema: () => TossIdentitySchema,
      TossLoginSchema: () => TossLoginSchema,
      UpdatePollSchema: () => UpdatePollSchema,
      VOICE: () => VOICE,
      VoteSchema: () => VoteSchema,
      categoryMeta: () => categoryMeta
    });
    module2.exports = __toCommonJS(index_exports);
    var import_zod = require("zod");
    var MASCOT_NAME = "\uD53C\uD0A4";
    var MASCOT_EMOJI = "\u{1F951}";
    var MASCOT = {
      idle: { emoji: "\u{1F951}", line: "\uC624\uB298\uC740 \uBB34\uC2A8 \uACE0\uBBFC\uC774 \uC788\uC5B4\uC694?" },
      thinking: { emoji: "\u{1F951}\u{1F4AD}", line: "\uC74C\u2026 \uAC19\uC774 \uACE8\uB77C\uBCFC\uAE4C\uC694?" },
      celebrate: { emoji: "\u{1F951}\u{1F389}", line: "\uD22C\uD45C \uC644\uB8CC! \uACE8\uB77C\uC918\uC11C \uACE0\uB9C8\uC6CC\uC694" },
      empty: { emoji: "\u{1F951}", line: "\uC544\uC9C1 \uACE0\uBBFC\uC774 \uC5C6\uC5B4\uC694. \uCCAB \uACE0\uBBFC\uC744 \uC62C\uB824\uBCFC\uAE4C\uC694?" },
      sleeping: { emoji: "\u{1F951}\u{1F4A4}", line: "\uC5EC\uAE34 \uC544\uC9C1 \uC870\uC6A9\uD558\uB124\uC694" },
      curious: { emoji: "\u{1F951}\u{1F440}", line: "\uACB0\uACFC\uAC00 \uAD81\uAE08\uD574\uC694!" }
    };
    var POLL_CATEGORIES = [
      { id: "life", label: "\uC77C\uC0C1", emoji: "\u{1F354}", color: "#f6a560" },
      { id: "work", label: "\uC5C5\uBB34", emoji: "\u{1F4BC}", color: "#13c2a3" },
      { id: "education", label: "\uC218\uC5C5", emoji: "\u{1F393}", color: "#6c8cff" },
      { id: "event", label: "\uBAA8\uC784", emoji: "\u{1F389}", color: "#f48fb1" },
      { id: "product", label: "\uC81C\uD488", emoji: "\u{1F6CD}\uFE0F", color: "#b08cff" }
    ];
    function categoryMeta(id) {
      if (!id) return void 0;
      return POLL_CATEGORIES.find((category) => category.id === id);
    }
    var VOICE = {
      emptyPolls: "\uC544\uC9C1 \uACE0\uBBFC\uC774 \uC5C6\uC5B4\uC694. \uCCAB \uACE0\uBBFC\uC744 \uC62C\uB824\uBCFC\uAE4C\uC694? \u{1F951}",
      loading: "\uACE0\uBBFC\uC744 \uAC00\uC838\uC624\uACE0 \uC788\uC5B4\uC694\u2026 \u{1F951}",
      voteSuccess: "\uD22C\uD45C \uC644\uB8CC! \uACE8\uB77C\uC918\uC11C \uACE0\uB9C8\uC6CC\uC694 \u{1F389}",
      sharePrompt: "\uCE5C\uAD6C\uC5D0\uAC8C \uBB3C\uC5B4\uBCF4\uAE30",
      deleteConfirm: "\uC774 \uACE0\uBBFC\uC744 \uC815\uB9D0 \uC9C0\uC6B8\uAE4C\uC694? \u{1F97A}",
      scanHint: "\uCE74\uBA54\uB77C\uB85C \uC2A4\uCE94\uD558\uBA74 \uBC14\uB85C \uCC38\uC5EC\uD560 \uC218 \uC788\uC5B4\uC694"
    };
    var RADIUS = { sm: 12, md: 18, lg: 24, pill: 999 };
    var PollResultsVisibilitySchema = import_zod.z.enum(["afterVote", "always"]);
    var PollAttachmentSchema = import_zod.z.object({
      name: import_zod.z.string().min(1, "\uCCA8\uBD80\uD30C\uC77C \uC774\uB984\uC740 \uD544\uC218\uC785\uB2C8\uB2E4.").max(120, "\uCCA8\uBD80\uD30C\uC77C \uC774\uB984\uC740 120\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."),
      type: import_zod.z.string().max(80, "\uCCA8\uBD80\uD30C\uC77C \uD615\uC2DD\uC740 80\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."),
      size: import_zod.z.number().int().min(1, "\uCCA8\uBD80\uD30C\uC77C \uD06C\uAE30\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.").max(3e5, "\uCCA8\uBD80\uD30C\uC77C\uC740 300KB \uC774\uD558\uB9CC \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."),
      dataUrl: import_zod.z.string().max(42e4, "\uCCA8\uBD80\uD30C\uC77C \uB370\uC774\uD130\uB294 \uD30C\uC77C\uB2F9 420KB \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.")
    });
    var CreatePollSchema = import_zod.z.object({
      question: import_zod.z.string().min(2, "\uC9C8\uBB38\uC740 \uCD5C\uC18C 2\uAE00\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(100, "\uC9C8\uBB38\uC740 \uCD5C\uB300 100\uAE00\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."),
      description: import_zod.z.string().max(500, "\uC124\uBA85\uC740 \uCD5C\uB300 500\uAE00\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable(),
      endsAt: import_zod.z.string().datetime("\uB9C8\uAC10 \uC2DC\uAC04 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.").optional().nullable(),
      resultsVisibility: PollResultsVisibilitySchema.optional().nullable(),
      options: import_zod.z.array(
        import_zod.z.object({
          text: import_zod.z.string().min(1, "\uC120\uD0DD\uC9C0\uB294 \uBE48 \uCE78\uC77C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."),
          imageUrl: import_zod.z.string().max(16e4, "\uC774\uBBF8\uC9C0 \uB370\uC774\uD130\uB294 \uC120\uD0DD\uC9C0\uB2F9 160KB \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable()
        })
      ).min(2, "\uCD5C\uC18C 2\uAC1C \uC774\uC0C1\uC758 \uC120\uD0DD\uC9C0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.").max(10, "\uCD5C\uB300 10\uAC1C\uAE4C\uC9C0\uC758 \uC120\uD0DD\uC9C0\uB9CC \uB4F1\uB85D \uAC00\uB2A5\uD569\uB2C8\uB2E4."),
      attachments: import_zod.z.array(PollAttachmentSchema).max(3, "\uCCA8\uBD80\uD30C\uC77C\uC740 \uCD5C\uB300 3\uAC1C\uAE4C\uC9C0 \uB4F1\uB85D \uAC00\uB2A5\uD569\uB2C8\uB2E4.").optional().nullable(),
      categoryId: import_zod.z.string().optional().nullable()
    });
    var UpdatePollSchema = import_zod.z.object({
      question: import_zod.z.string().min(2, "\uC9C8\uBB38\uC740 \uCD5C\uC18C 2\uAE00\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(100, "\uC9C8\uBB38\uC740 \uCD5C\uB300 100\uAE00\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional(),
      description: import_zod.z.string().max(500, "\uC124\uBA85\uC740 \uCD5C\uB300 500\uAE00\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable(),
      endsAt: import_zod.z.string().datetime("\uB9C8\uAC10 \uC2DC\uAC04 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.").optional().nullable(),
      resultsVisibility: PollResultsVisibilitySchema.optional().nullable(),
      options: import_zod.z.array(
        import_zod.z.object({
          text: import_zod.z.string().min(1, "\uC120\uD0DD\uC9C0\uB294 \uBE48 \uCE78\uC77C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."),
          imageUrl: import_zod.z.string().max(16e4, "\uC774\uBBF8\uC9C0 \uB370\uC774\uD130\uB294 \uC120\uD0DD\uC9C0\uB2F9 160KB \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable()
        })
      ).min(2, "\uCD5C\uC18C 2\uAC1C \uC774\uC0C1\uC758 \uC120\uD0DD\uC9C0\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.").max(10, "\uCD5C\uB300 10\uAC1C\uAE4C\uC9C0\uC758 \uC120\uD0DD\uC9C0\uB9CC \uB4F1\uB85D \uAC00\uB2A5\uD569\uB2C8\uB2E4.").optional(),
      attachments: import_zod.z.array(PollAttachmentSchema).max(3, "\uCCA8\uBD80\uD30C\uC77C\uC740 \uCD5C\uB300 3\uAC1C\uAE4C\uC9C0 \uB4F1\uB85D \uAC00\uB2A5\uD569\uB2C8\uB2E4.").optional().nullable(),
      categoryId: import_zod.z.string().optional().nullable()
    }).refine((value) => Object.keys(value).length > 0, {
      message: "\uC218\uC815\uD560 \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."
    });
    var VoteSchema = import_zod.z.object({
      optionId: import_zod.z.number({ required_error: "\uC120\uD0DD\uD560 \uC635\uC158 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." }),
      voterName: import_zod.z.string().max(20, "\uD22C\uD45C\uC790 \uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable(),
      comment: import_zod.z.string().max(100, "\uC758\uACAC\uC740 \uCD5C\uB300 100\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable()
    });
    var RegisterSchema = import_zod.z.object({
      email: import_zod.z.string({ required_error: "\uC774\uBA54\uC77C\uC740 \uD544\uC218\uC785\uB2C8\uB2E4." }).trim().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4."),
      password: import_zod.z.string({ required_error: "\uBE44\uBC00\uBC88\uD638\uB294 \uD544\uC218\uC785\uB2C8\uB2E4." }).min(6, "\uBE44\uBC00\uBC88\uD638\uB294 \uCD5C\uC18C 6\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."),
      nickname: import_zod.z.string().trim().min(2, "\uB2C9\uB124\uC784\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(20, "\uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional(),
      name: import_zod.z.string().trim().min(2, "\uB2C9\uB124\uC784\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(20, "\uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional()
    }).superRefine((value, ctx) => {
      const resolved = value.nickname ?? value.name;
      if (!resolved?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "\uB2C9\uB124\uC784\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.",
          path: ["nickname"]
        });
      }
    }).transform(({ email, password, nickname, name }) => ({
      email,
      password,
      nickname: (nickname ?? name ?? "").trim()
    }));
    var LoginSchema = import_zod.z.object({
      email: import_zod.z.string({ required_error: "\uC774\uBA54\uC77C\uC740 \uD544\uC218\uC785\uB2C8\uB2E4." }).trim().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4."),
      password: import_zod.z.string({ required_error: "\uBE44\uBC00\uBC88\uD638\uB294 \uD544\uC218\uC785\uB2C8\uB2E4." }).min(6, "\uBE44\uBC00\uBC88\uD638\uB294 \uCD5C\uC18C 6\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.")
    });
    var GuestRegisterSchema = import_zod.z.object({
      nickname: import_zod.z.string({ required_error: "\uB2C9\uB124\uC784\uC740 \uD544\uC218\uC785\uB2C8\uB2E4." }).trim().min(2, "\uB2C9\uB124\uC784\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").max(20, "\uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.")
    });
    var TossIdentitySchema = import_zod.z.object({
      anonymousKey: import_zod.z.string({ required_error: "\uD1A0\uC2A4 \uC0AC\uC6A9\uC790 \uC2DD\uBCC4\uD0A4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." }).trim().min(8, "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC2DD\uBCC4\uD0A4\uC785\uB2C8\uB2E4.").max(256, "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC2DD\uBCC4\uD0A4\uC785\uB2C8\uB2E4."),
      nickname: import_zod.z.string().trim().max(20, "\uB2C9\uB124\uC784\uC740 \uCD5C\uB300 20\uC790 \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.").optional().nullable()
    });
    var TossLoginSchema = import_zod.z.object({
      authorizationCode: import_zod.z.string({ required_error: "\uC778\uAC00 \uCF54\uB4DC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." }).trim().min(1, "\uC778\uAC00 \uCF54\uB4DC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4."),
      referrer: import_zod.z.string().trim().min(1).optional().nullable()
    });
  }
});

// apps/api/dist/modules/auth/auth.guard.js
var require_auth_guard = __commonJS({
  "apps/api/dist/modules/auth/auth.guard.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OptionalAuthGuard = exports2.AdminGuard = exports2.AuthGuard = void 0;
    var common_1 = require("@nestjs/common");
    var jwt_1 = require("@nestjs/jwt");
    var admin_1 = require_admin();
    var AuthGuard = class AuthGuard {
      jwtService;
      constructor(jwtService) {
        this.jwtService = jwtService;
      }
      async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
          throw new common_1.UnauthorizedException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }
        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: "picky-secret-key-12345!"
          });
          request["user"] = { ...payload, isAdmin: (0, admin_1.isAdminEmail)(payload?.email) };
        } catch {
          throw new common_1.UnauthorizedException("\uC720\uD6A8\uD558\uC9C0 \uC54A\uAC70\uB098 \uB9CC\uB8CC\uB41C \uD1A0\uD070\uC785\uB2C8\uB2E4.");
        }
        return true;
      }
      extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : void 0;
      }
    };
    exports2.AuthGuard = AuthGuard;
    exports2.AuthGuard = AuthGuard = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [jwt_1.JwtService])
    ], AuthGuard);
    var AdminGuard = class AdminGuard {
      jwtService;
      constructor(jwtService) {
        this.jwtService = jwtService;
      }
      async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
          throw new common_1.UnauthorizedException("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        }
        let payload;
        try {
          payload = await this.jwtService.verifyAsync(token, {
            secret: "picky-secret-key-12345!"
          });
        } catch {
          throw new common_1.UnauthorizedException("\uC720\uD6A8\uD558\uC9C0 \uC54A\uAC70\uB098 \uB9CC\uB8CC\uB41C \uD1A0\uD070\uC785\uB2C8\uB2E4.");
        }
        if (!(0, admin_1.isAdminEmail)(payload?.email)) {
          throw new common_1.ForbiddenException("\uC6B4\uC601\uC790\uB9CC \uC811\uADFC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
        }
        request["user"] = { ...payload, isAdmin: true };
        return true;
      }
      extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : void 0;
      }
    };
    exports2.AdminGuard = AdminGuard;
    exports2.AdminGuard = AdminGuard = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [jwt_1.JwtService])
    ], AdminGuard);
    var OptionalAuthGuard = class OptionalAuthGuard {
      jwtService;
      constructor(jwtService) {
        this.jwtService = jwtService;
      }
      async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (token) {
          try {
            const payload = await this.jwtService.verifyAsync(token, {
              secret: "picky-secret-key-12345!"
            });
            request["user"] = payload;
          } catch {
          }
        }
        return true;
      }
      extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : void 0;
      }
    };
    exports2.OptionalAuthGuard = OptionalAuthGuard;
    exports2.OptionalAuthGuard = OptionalAuthGuard = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [jwt_1.JwtService])
    ], OptionalAuthGuard);
  }
});

// apps/api/dist/modules/auth/auth.controller.js
var require_auth_controller = __commonJS({
  "apps/api/dist/modules/auth/auth.controller.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var __param = exports2 && exports2.__param || function(paramIndex, decorator) {
      return function(target, key) {
        decorator(target, key, paramIndex);
      };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AuthController = void 0;
    var common_1 = require("@nestjs/common");
    var nestjs_zod_1 = require("nestjs-zod");
    var shared_1 = require_dist2();
    var auth_service_1 = require_auth_service();
    var auth_guard_1 = require_auth_guard();
    var RegisterDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.RegisterSchema) {
    };
    var LoginDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.LoginSchema) {
    };
    var GuestRegisterDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.GuestRegisterSchema) {
    };
    var TossIdentityDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.TossIdentitySchema) {
    };
    var TossLoginDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.TossLoginSchema) {
    };
    var AuthController = class AuthController {
      authService;
      constructor(authService) {
        this.authService = authService;
      }
      async register(dto) {
        return this.authService.register(dto);
      }
      async registerGuest(dto) {
        return this.authService.registerGuest(dto);
      }
      async login(dto) {
        return this.authService.login(dto);
      }
      async loginWithTossIdentity(dto) {
        return this.authService.loginWithTossIdentity(dto);
      }
      async loginWithTossAuthCode(dto) {
        return this.authService.loginWithTossAuthCode(dto);
      }
      async me(req) {
        const user = await this.authService.validateUser(req.user);
        return user;
      }
    };
    exports2.AuthController = AuthController;
    __decorate([
      (0, common_1.Post)("register"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [RegisterDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "register", null);
    __decorate([
      (0, common_1.Post)("guest"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [GuestRegisterDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "registerGuest", null);
    __decorate([
      (0, common_1.Post)("login"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [LoginDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "login", null);
    __decorate([
      (0, common_1.Post)("toss"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [TossIdentityDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "loginWithTossIdentity", null);
    __decorate([
      (0, common_1.Post)("toss/login"),
      __param(0, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [TossLoginDto]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "loginWithTossAuthCode", null);
    __decorate([
      (0, common_1.Get)("me"),
      (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
      __param(0, (0, common_1.Request)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [Object]),
      __metadata("design:returntype", Promise)
    ], AuthController.prototype, "me", null);
    exports2.AuthController = AuthController = __decorate([
      (0, common_1.Controller)("auth"),
      (0, common_1.UsePipes)(nestjs_zod_1.ZodValidationPipe),
      __metadata("design:paramtypes", [auth_service_1.AuthService])
    ], AuthController);
  }
});

// apps/api/dist/modules/auth/auth.module.js
var require_auth_module = __commonJS({
  "apps/api/dist/modules/auth/auth.module.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AuthModule = void 0;
    var common_1 = require("@nestjs/common");
    var jwt_1 = require("@nestjs/jwt");
    var database_module_1 = require_database_module();
    var auth_service_1 = require_auth_service();
    var auth_controller_1 = require_auth_controller();
    var auth_guard_1 = require_auth_guard();
    var AuthModule = class AuthModule {
    };
    exports2.AuthModule = AuthModule;
    exports2.AuthModule = AuthModule = __decorate([
      (0, common_1.Module)({
        imports: [
          database_module_1.DatabaseModule,
          jwt_1.JwtModule.register({
            global: true,
            secret: "picky-secret-key-12345!",
            signOptions: { expiresIn: "7d" }
          })
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, auth_guard_1.AuthGuard, auth_guard_1.AdminGuard, auth_guard_1.OptionalAuthGuard],
        exports: [auth_service_1.AuthService, auth_guard_1.AuthGuard, auth_guard_1.AdminGuard, auth_guard_1.OptionalAuthGuard]
      })
    ], AuthModule);
  }
});

// apps/api/dist/modules/poll/poll.service.js
var require_poll_service = __commonJS({
  "apps/api/dist/modules/poll/poll.service.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PollService = void 0;
    var common_1 = require("@nestjs/common");
    var database_service_1 = require_database_service();
    var PollService = class PollService {
      db;
      constructor(db) {
        this.db = db;
      }
      isPollClosed(poll) {
        if (!poll.endsAt) {
          return false;
        }
        const endsAtTime = new Date(poll.endsAt).getTime();
        return Number.isFinite(endsAtTime) && Date.now() >= endsAtTime;
      }
      async generateShortId() {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let id = "";
        for (let i = 0; i < 6; i++) {
          id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existed = await this.db.getPollById(id);
        if (existed) {
          return this.generateShortId();
        }
        return id;
      }
      async getPolls() {
        return this.db.getPolls();
      }
      async getPoll(id) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
          throw new common_1.NotFoundException(`\uACE0\uBBFC(\uD22C\uD45C) ID ${id}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        return poll;
      }
      async createPoll(input, creatorId = null, creatorIsGuest = true) {
        const pollId = await this.generateShortId();
        const normalizedEndsAt = input.endsAt || null;
        if (normalizedEndsAt) {
          const endsAtTime = new Date(normalizedEndsAt).getTime();
          if (!Number.isFinite(endsAtTime) || endsAtTime <= Date.now() + 60 * 1e3) {
            throw new common_1.BadRequestException("\uB9C8\uAC10 \uC2DC\uAC04\uC740 \uD604\uC7AC\uBCF4\uB2E4 \uCD5C\uC18C 1\uBD84 \uC774\uD6C4\uB85C \uC124\uC815\uD574\uC57C \uD569\uB2C8\uB2E4.");
          }
        }
        const options = input.options.map((opt, index) => ({
          id: index + 1,
          text: opt.text,
          voteCount: 0,
          imageUrl: opt.imageUrl || null
        }));
        const newPoll = {
          id: pollId,
          question: input.question,
          description: input.description || null,
          options,
          comments: [],
          attachments: input.attachments || [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          endsAt: normalizedEndsAt,
          totalVotes: 0,
          resultsVisibility: input.resultsVisibility || "afterVote",
          creatorId,
          creatorIsGuest,
          categoryId: input.categoryId || null
        };
        await this.db.createPoll(newPoll);
        return newPoll;
      }
      assertCanManage(poll, userId, isAdmin, action) {
        if (isAdmin) {
          return;
        }
        if (!userId || !poll.creatorId || poll.creatorId !== userId) {
          throw new common_1.ForbiddenException(`\uB0B4\uAC00 \uB9CC\uB4E0 \uACE0\uBBFC\uB9CC ${action}\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
        }
      }
      validateEndsAt(rawEndsAt) {
        if (!rawEndsAt) {
          return null;
        }
        const endsAtTime = new Date(rawEndsAt).getTime();
        if (!Number.isFinite(endsAtTime) || endsAtTime <= Date.now() + 60 * 1e3) {
          throw new common_1.BadRequestException("\uB9C8\uAC10 \uC2DC\uAC04\uC740 \uD604\uC7AC\uBCF4\uB2E4 \uCD5C\uC18C 1\uBD84 \uC774\uD6C4\uB85C \uC124\uC815\uD574\uC57C \uD569\uB2C8\uB2E4.");
        }
        return rawEndsAt;
      }
      async deletePoll(id, userId, isAdmin = false) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
          throw new common_1.NotFoundException(`\uACE0\uBBFC(\uD22C\uD45C) ID ${id}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        this.assertCanManage(poll, userId, isAdmin, "\uC0AD\uC81C");
        await this.db.deletePoll(id);
        return { id, deleted: true };
      }
      async updatePoll(id, input, userId, isAdmin = false) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
          throw new common_1.NotFoundException(`\uACE0\uBBFC(\uD22C\uD45C) ID ${id}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        this.assertCanManage(poll, userId, isAdmin, "\uC218\uC815");
        const next = { ...poll };
        if (input.question !== void 0) {
          next.question = input.question;
        }
        if (input.description !== void 0) {
          next.description = input.description || null;
        }
        if (input.resultsVisibility !== void 0) {
          next.resultsVisibility = input.resultsVisibility || "afterVote";
        }
        if (input.categoryId !== void 0) {
          next.categoryId = input.categoryId || null;
        }
        if (input.endsAt !== void 0) {
          next.endsAt = this.validateEndsAt(input.endsAt || null);
        }
        if (input.attachments !== void 0) {
          next.attachments = input.attachments || [];
        }
        let optionsStructurallyChanged = false;
        if (input.options !== void 0) {
          const incoming = input.options;
          const hasVotes = poll.totalVotes > 0;
          const sameCount = incoming.length === poll.options.length;
          if (hasVotes) {
            if (!sameCount) {
              throw new common_1.BadRequestException("\uC774\uBBF8 \uD22C\uD45C\uAC00 \uC2DC\uC791\uB3FC \uC120\uD0DD\uC9C0 \uAC1C\uC218\uB294 \uBC14\uAFC0 \uC218 \uC5C6\uC5B4\uC694. \uC120\uD0DD\uC9C0 \uAE00\xB7\uC774\uBBF8\uC9C0\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC5B4\uC694.");
            }
            next.options = incoming.map((option, index) => {
              const existing = poll.options[index];
              return {
                id: existing?.id ?? index + 1,
                text: option.text,
                voteCount: existing?.voteCount ?? 0,
                imageUrl: option.imageUrl || null
              };
            });
          } else {
            next.options = incoming.map((option, index) => ({
              id: index + 1,
              text: option.text,
              voteCount: 0,
              imageUrl: option.imageUrl || null
            }));
            optionsStructurallyChanged = true;
          }
        }
        await this.db.savePollContent(next, { optionsStructurallyChanged });
        return next;
      }
      async deleteComment(id, commentId, userId, isAdmin = false) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
          throw new common_1.NotFoundException(`\uACE0\uBBFC(\uD22C\uD45C) ID ${id}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        this.assertCanManage(poll, userId, isAdmin, "\uAD00\uB9AC");
        const exists = poll.comments.some((comment) => comment.id === commentId);
        if (!exists) {
          throw new common_1.NotFoundException(`\uB313\uAE00 ID ${commentId}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        await this.db.deleteComment(id, commentId);
        return { id, commentId, deleted: true };
      }
      async vote(id, input) {
        const poll = await this.db.getPollById(id);
        if (!poll) {
          throw new common_1.NotFoundException(`\uACE0\uBBFC(\uD22C\uD45C) ID ${id}\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
        }
        if (this.isPollClosed(poll)) {
          throw new common_1.BadRequestException("\uB9C8\uAC10\uB41C \uD22C\uD45C\uC5D0\uB294 \uB354 \uC774\uC0C1 \uCC38\uC5EC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }
        const option = poll.options.find((o) => o.id === input.optionId);
        if (!option) {
          throw new common_1.BadRequestException(`\uC62C\uBC14\uB974\uC9C0 \uC54A\uC740 \uC120\uD0DD\uC9C0 ID(${input.optionId})\uC785\uB2C8\uB2E4.`);
        }
        option.voteCount += 1;
        poll.totalVotes += 1;
        if (input.comment?.trim()) {
          const commentId = poll.comments.length + 1;
          const newComment = {
            id: commentId,
            voterName: input.voterName?.trim() ? input.voterName.trim() : "\uC775\uBA85",
            comment: input.comment.trim(),
            createdAt: (/* @__PURE__ */ new Date()).toISOString(),
            selectedOptionId: input.optionId,
            selectedOptionText: option.text
          };
          poll.comments.push(newComment);
        }
        await this.db.updatePoll(poll);
        return poll;
      }
    };
    exports2.PollService = PollService;
    exports2.PollService = PollService = __decorate([
      (0, common_1.Injectable)(),
      __metadata("design:paramtypes", [database_service_1.DatabaseService])
    ], PollService);
  }
});

// apps/api/dist/modules/poll/poll.controller.js
var require_poll_controller = __commonJS({
  "apps/api/dist/modules/poll/poll.controller.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports2 && exports2.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var __param = exports2 && exports2.__param || function(paramIndex, decorator) {
      return function(target, key) {
        decorator(target, key, paramIndex);
      };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PollController = void 0;
    var common_1 = require("@nestjs/common");
    var nestjs_zod_1 = require("nestjs-zod");
    var shared_1 = require_dist2();
    var poll_service_1 = require_poll_service();
    var auth_guard_1 = require_auth_guard();
    var CreatePollDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.CreatePollSchema) {
    };
    var UpdatePollDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.UpdatePollSchema) {
    };
    var VoteDto = class extends (0, nestjs_zod_1.createZodDto)(shared_1.VoteSchema) {
    };
    var trimTrailingSlashes = (value) => {
      let end = value.length;
      while (end > 0 && value.codePointAt(end - 1) === 47) {
        end -= 1;
      }
      return end === value.length ? value : value.slice(0, end);
    };
    var PollController = class PollController {
      pollService;
      constructor(pollService) {
        this.pollService = pollService;
      }
      getPolls() {
        return this.pollService.getPolls();
      }
      createPoll(req, dto) {
        const user = req.user;
        const creatorId = user?.sub || null;
        const creatorIsGuest = user ? Boolean(user.isGuest) : true;
        return this.pollService.createPoll(dto, creatorId, creatorIsGuest);
      }
      async getPollSharePreview(id, req, res) {
        const poll = await this.pollService.getPoll(id);
        const requestOrigin = this.getRequestOrigin(req);
        const appOrigin = this.getPublicAppOrigin(req);
        const pollUrl = this.resolveSafePollRedirectUrl(req, `${appOrigin}/poll/${encodeURIComponent(poll.id)}`);
        const shareUrl = pollUrl;
        const shareImage = this.resolvePollShareImage(poll, requestOrigin, appOrigin);
        const safeShareUrl = this.escapeHtml(shareUrl);
        const safePollUrl = this.escapeHtml(pollUrl);
        const safeImageUrl = this.escapeHtml(shareImage.url);
        const imageType = this.escapeHtml(shareImage.mimeType);
        const titleText = `${poll.question} | picky`;
        const descriptionText = poll.description || "\uACB0\uC815\uC5D0 \uCC38\uC5EC\uD558\uACE0 \uC758\uACAC\uC744 \uB0A8\uACA8\uC8FC\uC138\uC694.";
        const publishedTimeText = poll.createdAt || (/* @__PURE__ */ new Date()).toISOString();
        const updatedTimeText = poll.updatedAt || poll.createdAt || (/* @__PURE__ */ new Date()).toISOString();
        const title = this.escapeHtml(titleText);
        const description = this.escapeHtml(descriptionText);
        const publishedTime = this.escapeHtml(publishedTimeText);
        const updatedTime = this.escapeHtml(updatedTimeText);
        const optionSummaryText = poll.options.slice(0, 4).map((option, index) => `${index + 1}. ${option.text}`).join(" \xB7 ");
        const optionSummary = this.escapeHtml(optionSummaryText);
        const appDomain = this.escapeHtml(new URL(appOrigin).host);
        const structuredData = this.escapeJsonForHtml({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: titleText,
          description: descriptionText,
          url: shareUrl,
          image: shareImage.url,
          datePublished: publishedTimeText,
          dateModified: updatedTimeText,
          isPartOf: {
            "@type": "WebSite",
            name: "picky",
            url: appOrigin
          },
          mainEntity: {
            "@type": "Question",
            name: poll.question,
            text: descriptionText,
            answerCount: poll.options.length,
            suggestedAnswer: poll.options.slice(0, 6).map((option) => ({
              "@type": "Answer",
              text: option.text,
              upvoteCount: option.voteCount
            }))
          }
        });
        res.status(200).set({
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400"
        }).type("text/html").send(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="application-name" content="picky" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#061411" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="picky" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${safeShareUrl}" />
    <meta property="og:image" content="${safeImageUrl}" />
    <meta property="og:image:url" content="${safeImageUrl}" />
    <meta property="og:image:secure_url" content="${safeImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="${imageType}" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="al:web:url" content="${safePollUrl}" />
    <meta property="article:published_time" content="${publishedTime}" />
    <meta property="article:modified_time" content="${updatedTime}" />
    <meta property="article:section" content="poll" />
    <meta property="og:updated_time" content="${updatedTime}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@picky_io" />
    <meta name="twitter:creator" content="@picky_io" />
    <meta name="twitter:domain" content="${appDomain}" />
    <meta name="twitter:url" content="${safeShareUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${safeImageUrl}" />
    <meta name="twitter:image:alt" content="${title}" />
    <link rel="canonical" href="${safePollUrl}" />
    <link rel="image_src" href="${safeImageUrl}" />
    <script type="application/ld+json">${structuredData}</script>
    <script>
      window.setTimeout(function () {
        window.location.replace(${JSON.stringify(pollUrl)});
      }, 80);
    </script>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #061411;
        color: #f4fffc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(92vw, 560px);
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 14px;
        padding: 28px;
        background: #0e211e;
      }
      a { color: #20d6b2; }
      p { color: #b8d6cf; line-height: 1.6; }
      small { color: #7ca59b; }
    </style>
  </head>
  <body>
    <main>
      <small>picky poll</small>
      <h1>${title}</h1>
      <p>${description}</p>
      <p>${optionSummary}</p>
      <a href="${safePollUrl}">\uD22C\uD45C \uD654\uBA74\uC73C\uB85C \uC774\uB3D9</a>
    </main>
  </body>
</html>`);
      }
      async getPollOptionImage(id, optionId, req, res) {
        const poll = await this.pollService.getPoll(id);
        const fallbackImageUrl = `${this.getPublicAppOrigin(req)}/og-default.png`;
        const option = poll.options.find((pollOption) => String(pollOption.id) === optionId);
        const imageUrl = option?.imageUrl || "";
        if (!option || !imageUrl) {
          return res.redirect(302, fallbackImageUrl);
        }
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          return res.redirect(302, imageUrl);
        }
        const dataImage = this.parseDataImage(imageUrl);
        if (!dataImage) {
          return res.redirect(302, fallbackImageUrl);
        }
        return res.status(200).set({
          "Content-Type": dataImage.mimeType,
          "Cache-Control": "public, max-age=31536000, immutable"
        }).send(dataImage.buffer);
      }
      getPoll(id) {
        return this.pollService.getPoll(id);
      }
      vote(id, dto) {
        return this.pollService.vote(id, dto);
      }
      updatePoll(id, req, dto) {
        return this.pollService.updatePoll(id, dto, req.user?.sub ?? null, Boolean(req.user?.isAdmin));
      }
      deletePoll(id, req) {
        return this.pollService.deletePoll(id, req.user?.sub ?? null, Boolean(req.user?.isAdmin));
      }
      deleteComment(id, commentId, req) {
        return this.pollService.deleteComment(id, commentId, req.user?.sub ?? null, Boolean(req.user?.isAdmin));
      }
      getRequestOrigin(req) {
        const proto = (String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0] ?? "").trim();
        const host = (String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:5173").split(",")[0] ?? "").trim();
        return `${proto}://${host}`;
      }
      getPublicAppOrigin(req) {
        return this.normalizeOrigin(process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.WEB_ORIGIN || process.env.VITE_PUBLIC_APP_URL) || this.getRequestOrigin(req);
      }
      normalizeOrigin(value) {
        const raw = trimTrailingSlashes((typeof value === "string" ? value : "").trim());
        if (!raw) {
          return null;
        }
        const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
        try {
          return new URL(withProtocol).origin;
        } catch {
          return null;
        }
      }
      resolveSafePollRedirectUrl(req, fallbackUrl) {
        const rawRedirect = String(req.query?.redirectUrl || req.query?.redirect || "").trim();
        if (!rawRedirect || rawRedirect.length > 2048) {
          return fallbackUrl;
        }
        try {
          const redirectUrl = new URL(rawRedirect);
          const fallback = new URL(fallbackUrl);
          if (redirectUrl.origin !== fallback.origin || !redirectUrl.pathname.startsWith("/poll/")) {
            return fallbackUrl;
          }
          return redirectUrl.href;
        } catch {
          return fallbackUrl;
        }
      }
      resolvePollShareImage(poll, apiOrigin, appOrigin) {
        const defaultImage = {
          url: `${appOrigin}/og-default.png`,
          mimeType: "image/png"
        };
        const firstImageOption = poll.options.find((option) => Boolean(option.imageUrl));
        if (!firstImageOption) {
          return defaultImage;
        }
        const imageUrl = firstImageOption.imageUrl || "";
        if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
          return {
            url: imageUrl,
            mimeType: this.resolveImageMimeType(imageUrl)
          };
        }
        if (imageUrl.startsWith("data:image/")) {
          return {
            url: `${apiOrigin}/api/polls/${encodeURIComponent(poll.id)}/options/${encodeURIComponent(String(firstImageOption.id))}/image`,
            mimeType: this.resolveDataImageMimeType(imageUrl) || "image/jpeg"
          };
        }
        return defaultImage;
      }
      resolveImageMimeType(value) {
        const pathname = (value.split("?")[0] ?? "").toLowerCase();
        if (pathname.endsWith(".png")) {
          return "image/png";
        }
        if (pathname.endsWith(".webp")) {
          return "image/webp";
        }
        return "image/jpeg";
      }
      resolveDataImageMimeType(value) {
        const match = /^data:(image\/(?:png|jpe?g|webp));base64,/.exec(value);
        if (!match) {
          return null;
        }
        return match[1] === "image/jpg" ? "image/jpeg" : match[1] ?? null;
      }
      parseDataImage(value) {
        const match = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
        if (!match) {
          return null;
        }
        const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1] ?? "image/jpeg";
        const buffer = Buffer.from(match[2] ?? "", "base64");
        if (!buffer.length) {
          return null;
        }
        return { mimeType, buffer };
      }
      escapeJsonForHtml(value) {
        return JSON.stringify(value).replaceAll("&", String.raw`\u0026`).replaceAll("<", String.raw`\u003c`).replaceAll(">", String.raw`\u003e`);
      }
      escapeHtml(value) {
        return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
      }
    };
    exports2.PollController = PollController;
    __decorate([
      (0, common_1.Get)(),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", []),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "getPolls", null);
    __decorate([
      (0, common_1.Post)(),
      (0, common_1.UseGuards)(auth_guard_1.OptionalAuthGuard),
      __param(0, (0, common_1.Request)()),
      __param(1, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [Object, CreatePollDto]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "createPoll", null);
    __decorate([
      (0, common_1.Get)(":id/share"),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Request)()),
      __param(2, (0, common_1.Res)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, Object, Object]),
      __metadata("design:returntype", Promise)
    ], PollController.prototype, "getPollSharePreview", null);
    __decorate([
      (0, common_1.Get)(":id/options/:optionId/image"),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Param)("optionId")),
      __param(2, (0, common_1.Request)()),
      __param(3, (0, common_1.Res)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, String, Object, Object]),
      __metadata("design:returntype", Promise)
    ], PollController.prototype, "getPollOptionImage", null);
    __decorate([
      (0, common_1.Get)(":id"),
      __param(0, (0, common_1.Param)("id")),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "getPoll", null);
    __decorate([
      (0, common_1.Post)(":id/vote"),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, VoteDto]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "vote", null);
    __decorate([
      (0, common_1.Patch)(":id"),
      (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Request)()),
      __param(2, (0, common_1.Body)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, Object, UpdatePollDto]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "updatePoll", null);
    __decorate([
      (0, common_1.Delete)(":id"),
      (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Request)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, Object]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "deletePoll", null);
    __decorate([
      (0, common_1.Delete)(":id/comments/:commentId"),
      (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
      __param(0, (0, common_1.Param)("id")),
      __param(1, (0, common_1.Param)("commentId", common_1.ParseIntPipe)),
      __param(2, (0, common_1.Request)()),
      __metadata("design:type", Function),
      __metadata("design:paramtypes", [String, Number, Object]),
      __metadata("design:returntype", void 0)
    ], PollController.prototype, "deleteComment", null);
    exports2.PollController = PollController = __decorate([
      (0, common_1.Controller)("polls"),
      (0, common_1.UsePipes)(nestjs_zod_1.ZodValidationPipe),
      __metadata("design:paramtypes", [poll_service_1.PollService])
    ], PollController);
  }
});

// apps/api/dist/modules/poll/poll.module.js
var require_poll_module = __commonJS({
  "apps/api/dist/modules/poll/poll.module.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PollModule = void 0;
    var common_1 = require("@nestjs/common");
    var database_module_1 = require_database_module();
    var auth_module_1 = require_auth_module();
    var poll_controller_1 = require_poll_controller();
    var poll_service_1 = require_poll_service();
    var PollModule = class PollModule {
    };
    exports2.PollModule = PollModule;
    exports2.PollModule = PollModule = __decorate([
      (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, auth_module_1.AuthModule],
        controllers: [poll_controller_1.PollController],
        providers: [poll_service_1.PollService]
      })
    ], PollModule);
  }
});

// apps/api/dist/app.module.js
var require_app_module = __commonJS({
  "apps/api/dist/app.module.js"(exports2) {
    "use strict";
    var __decorate = exports2 && exports2.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AppModule = void 0;
    var common_1 = require("@nestjs/common");
    var database_module_1 = require_database_module();
    var poll_module_1 = require_poll_module();
    var auth_module_1 = require_auth_module();
    var AppModule = class AppModule {
    };
    exports2.AppModule = AppModule;
    exports2.AppModule = AppModule = __decorate([
      (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, poll_module_1.PollModule, auth_module_1.AuthModule]
      })
    ], AppModule);
  }
});

// apps/api/dist/main.js
var __importDefault = exports && exports.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiServer = createApiServer;
var core_1 = require("@nestjs/core");
var app_module_1 = require_app_module();
var helmet_1 = __importDefault(require("helmet"));
var compression_1 = __importDefault(require("compression"));
async function createApiServer() {
  const app = await core_1.NestFactory.create(app_module_1.AppModule);
  app.useBodyParser("json", { limit: "2mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "2mb" });
  app.enableCors({
    origin: "*",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  });
  app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
  app.use((0, compression_1.default)());
  app.enableShutdownHooks();
  app.setGlobalPrefix("api");
  const port = process.env.PORT || 3e3;
  console.log(`Picky API starting on http://localhost:${port}/api`);
  await app.init();
  return app;
}
async function bootstrap() {
  const app = await createApiServer();
  const port = process.env.PORT || 3e3;
  await app.listen(port);
}
if (require.main === module) {
  bootstrap();
}
