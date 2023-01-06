#!/usr/bin/env node

const meow = require('meow');
const path = require('path');
const {
  join: joinPath,
  delimiter: pathDelimiter
} = path;
const chalk = require('chalk');

const error = chalk.bold.red;

const {
  convertAll
} = require('./');


const cli = meow(`
  Usage

    $ form-js-to-image <formFile>${pathDelimiter}<outputConfig> ...

  Options

    formFile                    Path to form-js form
    outputConfig                   List of extension or output file paths

    --title=<title>                Add explicit <title> to exported image
    --no-title                     Don't display title on exported image

    --no-footer                    Strip title and logo from image

  Examples

    # export to form.html
    $ form-js-to-image camunda.form${pathDelimiter}form.html

`, {
  flags: {
    title: {
      default: true
    },
    footer: {
      default: true
    },
    scale: {
      default: 1
    }
  }
});

if (cli.input.length === 0) {
  cli.showHelp(1);
}

const conversions = cli.input.map(function(conversion) {

  const hasDelimiter = conversion.includes(pathDelimiter);
  if (!hasDelimiter) {
     console.error(error(`  Error: no <formFile>${pathDelimiter}<outputConfig> param provided`));
     cli.showHelp(1);
  }

  const [
    input,
    output
  ] = conversion.split(pathDelimiter);

  const outputs = output.split(',').reduce(function(outputs, file, idx) {

    // just extension
    if (file.indexOf('.') === -1) {
      const baseName = path.basename(idx === 0 ? input : outputs[idx - 1]);

      const name = baseName.substring(0, baseName.lastIndexOf('.'));

      return [ ...outputs, `${name}.${file}` ];
    }

    return [ ...outputs, file ];
  }, []);

  return {
    input,
    outputs
  }
});

const footer = cli.flags.footer;

const title = cli.flags.title === false ? false : cli.flags.title;

convertAll(conversions, {
  title,
  footer,
}).catch(function(e) {
  console.error('failed to export form(s)');
  console.error(e);

  process.exit(1);
});
