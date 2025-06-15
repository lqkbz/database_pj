#!/usr/bin/env node

/**
 * Independent OpenAPI documentation generation script
 * Can be run from the command line: node generate-docs.js
 */

const path = require('path');
const { generateApiSpec, saveApiSpecToFile } = require('./swagger');

async function main() {
  console.log('=== OpenAPI Documentation Generator ===');
  
  try {
    // Generate OpenAPI specification
    console.log('Generating OpenAPI specification...');
    const spec = generateApiSpec();
    console.log('OpenAPI specification generated successfully!');
    
    // Save to file
    console.log('Saving to file...');
    const success = await saveApiSpecToFile(spec);
    
    if (success) {
      console.log('✅ Documentation saved successfully to: docs/example-openapi.json');
      process.exit(0);
    } else {
      console.error('❌ Failed to save documentation');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ An error occurred during documentation generation:', error);
    process.exit(1);
  }
}

// Execute main function
main();
