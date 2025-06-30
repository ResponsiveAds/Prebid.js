# Responsive Stretch RTD Provider

The Responsive Stretch RTD Provider measures the available space that ad slots can take on the page and adds this information to ORTB bid requests. This enables bidders to make more informed decisions about ad sizing and responsive creative selection.

## Overview

This module analyzes the DOM to determine how much space is available around each ad slot, providing bidders with detailed information about:

- Current ad slot dimensions
- Available space for expansion in all directions
- Viewport size and position information
- Stretch potential categorization
- Parent container constraints

## Usage

To use the Responsive Stretch RTD Provider, include it in your Prebid.js build and configure it as follows:

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 100, // Allow time for DOM analysis
    dataProviders: [{
      name: 'responsiveStretch',
      waitForIt: true,
      params: {
        bidders: ['bidderA', 'bidderB'], // Optional: specific bidders
        global: true,     // Optional: add to global ORTB2 (default: true)
        impLevel: true    // Optional: add to impression level (default: true)
      }
    }]
  }
});
```

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `bidders` | Array | `[]` | Array of bidder codes to receive the data. If empty, data is added globally |
| `global` | Boolean | `true` | Whether to add data to global ORTB2 fragments |
| `impLevel` | Boolean | `true` | Whether to add data to impression-level ORTB2 |

## Data Structure

The module adds the following data structure to ORTB2 requests:

### Global/Bidder Level (site.ext.data.responsiveStretch)

```javascript
{
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "adUnits": {
    "div-gpt-ad-123": {
      "width": 300,
      "height": 250,
      "top": 100,
      "left": 50,
      "right": 1570,
      "bottom": 730,
      "maxWidth": 1920,
      "maxHeight": 1080,
      "stretchLeft": 50,
      "stretchRight": 1570,
      "stretchUp": 100,
      "stretchDown": 730,
      "totalAvailableWidth": 1920,
      "totalAvailableHeight": 1080,
      "viewportWidth": 1920,
      "viewportHeight": 1080,
      "isVisible": true,
      "viewportWidthPercentage": 16,
      "viewportHeightPercentage": 23,
      "parentWidth": 1200,
      "parentHeight": 800,
      "stretchPotential": {
        "horizontal": "high",
        "vertical": "medium"
      }
    }
  },
  "timestamp": 1640995200000
}
```

### Impression Level (imp.ext.data.responsiveStretch)

At the impression level, each ad unit receives its specific measurement data:

```javascript
{
  "width": 300,
  "height": 250,
  "stretchLeft": 50,
  "stretchRight": 1570,
  "stretchUp": 100,
  "stretchDown": 730,
  "stretchPotential": {
    "horizontal": "high",
    "vertical": "medium"
  },
  // ... other measurement data
}
```

## Data Fields Explanation

### Basic Dimensions
- `width`, `height`: Current ad slot dimensions
- `top`, `left`, `right`, `bottom`: Position relative to viewport

### Stretch Information
- `stretchLeft`, `stretchRight`, `stretchUp`, `stretchDown`: Available space for expansion in each direction
- `totalAvailableWidth`, `totalAvailableHeight`: Maximum possible dimensions if element could expand fully
- `stretchPotential`: Categorized stretch potential (high/medium/low) for horizontal and vertical directions

### Viewport Information
- `viewportWidth`, `viewportHeight`: Current viewport dimensions
- `viewportWidthPercentage`, `viewportHeightPercentage`: Percentage of viewport occupied by the ad slot

### Container Information
- `parentWidth`, `parentHeight`: Dimensions of the parent container
- `isVisible`: Whether the ad slot is currently visible in the viewport

## Element Detection

The module uses multiple strategies to find ad slot elements:

1. Direct ID lookup: `document.getElementById(adUnitCode)`
2. ID attribute selector: `[id="adUnitCode"]`
3. Data attribute selectors: `[data-ad-unit-code="adUnitCode"]`, `[data-adunitcode="adUnitCode"]`
4. Partial ID matching: `div[id*="adUnitCode"]`
5. Class name matching: `div[class*="adUnitCode"]`

## Use Cases

### Responsive Creative Selection
Bidders can use stretch information to select appropriately sized creatives:

```javascript
// Example: Choose creative based on available space
if (stretchData.stretchRight > 300 && stretchData.stretchPotential.horizontal === 'high') {
  // Use expandable banner creative
  selectCreative('expandable-728x90');
} else {
  // Use standard creative
  selectCreative('standard-300x250');
}
```

### Dynamic Sizing
Enable dynamic ad sizing based on available space:

```javascript
// Calculate optimal ad size
const optimalWidth = Math.min(stretchData.totalAvailableWidth, 728);
const optimalHeight = Math.min(stretchData.totalAvailableHeight, 300);
```

### Viewport Optimization
Optimize ad placement based on viewport information:

```javascript
// Adjust bidding strategy based on viewport usage
if (stretchData.viewportWidthPercentage > 50) {
  // Large ad taking significant viewport space
  increaseBidMultiplier(1.2);
}
```

## Best Practices

1. **Use `auctionDelay`**: Set a small auction delay (50-200ms) to ensure DOM elements are properly measured
2. **Configure `waitForIt: true`**: Ensure the auction waits for stretch data collection
3. **Target specific bidders**: Use the `bidders` parameter to only send data to bidders that can utilize it
4. **Monitor performance**: Track the impact of stretch data on bid responses and revenue

## Troubleshooting

### No Data Collected
- Ensure ad slot elements exist in the DOM before auction starts
- Check that ad unit codes match element IDs or data attributes
- Verify auction delay is sufficient for DOM readiness

### Incorrect Measurements
- Confirm elements are properly positioned and visible
- Check for CSS transformations that might affect measurements
- Verify parent container dimensions are correctly calculated

## Integration Examples

### Basic Setup
```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 100,
    dataProviders: [{
      name: 'responsiveStretch',
      waitForIt: true
    }]
  }
});
```

### Bidder-Specific Configuration
```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 150,
    dataProviders: [{
      name: 'responsiveStretch',
      waitForIt: true,
      params: {
        bidders: ['appnexus', 'rubicon'],
        global: false,
        impLevel: true
      }
    }]
  }
});
```

### Global Only Configuration
```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 100,
    dataProviders: [{
      name: 'responsiveStretch',
      waitForIt: true,
      params: {
        global: true,
        impLevel: false
      }
    }]
  }
});
```
