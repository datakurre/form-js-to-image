const puppeteer = require('puppeteer');
const fs = require('fs');

const {
  basename,
  resolve,
  relative
} = require('path');

const {
  readFileSync
} = require('fs');


async function printDiagram(page, options) {

  const {
    input,
    outputs,
    footer,
    title = true,
  } = options;

  const diagramXML = readFileSync(input, 'utf8');

  const diagramTitle = title === false ? false : (
    title.length ? title : basename(input)
  );

  await page.goto(`file://${__dirname}/skeleton.html`);

  const viewerScript = relative(__dirname, require.resolve('dmn-js/dist/dmn-viewer.production.min.js'));

  const desiredViewport = await page.evaluate(async function(diagramXML, options) {

    const {
      viewerScript,
      ...openOptions
    } = options;

    await loadScript(viewerScript);

    // returns desired viewport
    return openDecision(diagramXML, openOptions);
  }, diagramXML, {
    title: diagramTitle,
    viewerScript,
    footer
  });;

  for (const output of outputs) {

    console.log(`writing ${output}`);

    if (output.endsWith('.html')) {

      const html = await page.evaluate(() => toHTML());

      fs.writeFileSync(output, Buffer.from(html, 'utf8'), 'utf8');
    } else {
      console.error(`Unknown output file format: ${output}`);
    }
  }

}


async function withPage(fn) {
  let browser;

  try {
    browser = await puppeteer.launch();

    await fn(await browser.newPage());
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


async function convertAll(conversions, options={}) {

  const {
    footer,
    title,
  } = options;

  await withPage(async function(page) {

    for (const conversion of conversions) {

      const {
        input,
        outputs
      } = conversion;

      await printDiagram(page, {
        input,
        outputs,
        title,
        footer,
      });
    }

  });

}

module.exports.convertAll = convertAll;

async function convert(input, output) {
  return await convertAll([
    {
      input,
      outputs: [ output ]
    }
  ]);
}


module.exports.convert = convert;
