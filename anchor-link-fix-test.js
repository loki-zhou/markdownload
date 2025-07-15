/**
 * Anchor Link Fix Test Script
 * 
 * This script provides comprehensive testing for the anchor link fix implementation.
 * It tests various types of links and verifies that they are correctly processed.
 */

// Test data: various types of links to test
const testLinks = [
  // Pure anchor links
  { href: '#section1', description: 'Pure anchor link' },
  { href: '#', description: 'Empty anchor' },
  { href: '#section-with-中文', description: 'Anchor with Unicode characters' },
  
  // Relative links with anchors
  { href: 'page.html#section2', description: 'Relative link with anchor' },
  { href: './docs/guide.md#setup', description: 'Relative path with anchor' },
  { href: '../other/page.html#section', description: 'Parent directory relative link with anchor' },
  { href: 'page with spaces.html#section', description: 'URL with spaces and anchor' },
  { href: '?query=param#section', description: 'URL with query parameters and anchor' },
  
  // Absolute links with anchors
  { href: '/absolute/path#section', description: 'Absolute path with anchor' },
  { href: 'https://example.com#section', description: 'Absolute URL with anchor' },
  { href: 'https://github.com/user/repo#readme', description: 'GitHub URL with anchor' },
  
  // Edge cases
  { href: 'javascript:void(0)#section', description: 'JavaScript URL with anchor' },
  { href: 'mailto:user@example.com#section', description: 'Mailto URL with anchor' },
  { href: '//example.com#section', description: 'Protocol-relative URL with anchor' }
];

// Base URIs to test with
const baseURIs = [
  'https://github.com/user/repo/',
  'https://example.com/path/page.html',
  'chrome-extension://extension-id/offscreen.html', // Should trigger fallback
  null, // Should trigger fallback
  ''    // Should trigger fallback
];

/**
 * Test the isAnchorLink function
 */
function testIsAnchorLink() {
  console.log('=== Testing isAnchorLink function ===');
  
  testLinks.forEach(link => {
    const result = isAnchorLink(link.href);
    console.log(`${link.description} (${link.href}): ${result ? 'IS' : 'is NOT'} a pure anchor link`);
  });
  
  console.log('');
}

/**
 * Test the isRelativeToCurrentPage function
 */
function testIsRelativeToCurrentPage() {
  console.log('=== Testing isRelativeToCurrentPage function ===');
  
  testLinks.forEach(link => {
    const result = isRelativeToCurrentPage(link.href);
    console.log(`${link.description} (${link.href}): ${result ? 'IS' : 'is NOT'} relative to current page with anchor`);
  });
  
  console.log('');
}

/**
 * Test the validateUri function with different base URIs
 */
function testValidateUri() {
  console.log('=== Testing validateUri function ===');
  
  baseURIs.forEach(baseURI => {
    console.log(`\nTesting with baseURI: ${baseURI || 'null/undefined'}`);
    
    testLinks.forEach(link => {
      try {
        const result = validateUri(link.href, baseURI);
        console.log(`${link.description} (${link.href}) -> ${result}`);
      } catch (error) {
        console.error(`ERROR processing ${link.description} (${link.href}): ${error.message}`);
      }
    });
  });
  
  console.log('');
}

/**
 * Test the validateUriWithFallback function
 */
function testValidateUriWithFallback() {
  console.log('=== Testing validateUriWithFallback function ===');
  
  // Test with invalid baseURI to trigger fallback
  const invalidBaseURI = 'invalid://url';
  
  testLinks.forEach(link => {
    try {
      const result = validateUriWithFallback(link.href, invalidBaseURI, link.href);
      console.log(`${link.description} (${link.href}) -> ${result}`);
    } catch (error) {
      console.error(`ERROR processing ${link.description} (${link.href}): ${error.message}`);
    }
  });
  
  console.log('');
}

/**
 * Test URL parsing cache
 */
function testUrlParseCache() {
  console.log('=== Testing URL parsing cache ===');
  
  // Clear cache first
  urlParseCache.clear();
  
  // Parse some URLs
  const urls = [
    'https://example.com',
    'https://github.com',
    'https://example.com', // Duplicate to test cache hit
    'https://example.com/path'
  ];
  
  urls.forEach(url => {
    console.log(`Parsing URL: ${url}`);
    const start = performance.now();
    const result = safeUrlParse(url);
    const end = performance.now();
    console.log(`  Result: ${result ? 'Valid URL' : 'Invalid URL'}, Time: ${(end - start).toFixed(3)}ms`);
  });
  
  console.log(`Cache size: ${urlParseCache.size}`);
  console.log('');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('Running anchor link fix tests...\n');
  
  testIsAnchorLink();
  testIsRelativeToCurrentPage();
  testValidateUri();
  testValidateUriWithFallback();
  testUrlParseCache();
  
  console.log('All tests completed.');
}

// Execute tests when loaded in a browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Add a button to run tests
    const button = document.createElement('button');
    button.textContent = 'Run Anchor Link Tests';
    button.style.padding = '10px';
    button.style.margin = '20px';
    button.addEventListener('click', runAllTests);
    document.body.appendChild(button);
    
    console.log('Anchor link test script loaded. Click the button to run tests.');
  });
}