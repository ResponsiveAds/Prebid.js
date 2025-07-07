/**
 * This module adds responsiveStretch provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will measure available space for ad slots and add this information to ORTB requests
 * @module modules/responsiveStretchProvider
 * @requires module:modules/realTimeData
 */

import {
  logError,
  logInfo,
  logWarn,
  mergeDeep,
  isArray,
  isEmpty
} from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getViewportSize } from '../libraries/viewport/viewport.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'responsiveStretch';

let _moduleConfig = {};

/**
 * Calculate available space for an ad slot
 * @param {HTMLElement} element - The ad slot element
 * @returns {Object} Object containing dimensions and stretch information
 */
function calculateAdSlotSpace(element) {
  if (!element) {
    return null;
  }

  try {
    const rect = getBoundingClientRect(element);
    const viewportSize = getViewportSize();
    const maxAvailableWidth = getMaxAvailableWidth(element);

    // Calculate available space in all directions
    const availableSpace = {
      // Current element dimensions
      width: Math.round(rect.width),
      height: Math.round(rect.height),

      // Viewport information
      viewportWidth: Math.round(viewportSize.width),
      viewportHeight: Math.round(viewportSize.height),

      // Visibility information
      // isVisible: rect.width > 0 && rect.height > 0 &&
      //           rect.bottom > 0 && rect.right > 0 &&
      //           rect.top < viewportSize.height && rect.left < viewportSize.width,

      maxAvailableWidth: Math.round(maxAvailableWidth),
    };

    return availableSpace;
  } catch (error) {
    logError(MODULE_NAME, 'Error calculating ad slot space:', error);
    return null;
  }
}

/**
 * Find ad slot element by ad unit code
 * @param {string} adUnitCode - The ad unit code
 * @returns {HTMLElement|null} The ad slot element
 */
function findAdSlotElement(adUnitCode) {
  // Try multiple strategies to find the element
  const strategies = [
    () => document.getElementById(adUnitCode),
    () => document.querySelector(`[id="${adUnitCode}"]`),
    () => document.querySelector(`[data-ad-unit-code="${adUnitCode}"]`),
    () => document.querySelector(`[data-adunitcode="${adUnitCode}"]`),
    () => document.querySelector(`div[id*="${adUnitCode}"]`),
    () => document.querySelector(`div[class*="${adUnitCode}"]`)
  ];

  for (const strategy of strategies) {
    try {
      const element = strategy();
      if (element) {
        return element;
      }
    } catch (error) {
      // Continue to next strategy
    }
  }

  logWarn(MODULE_NAME, `Could not find element for ad unit: ${adUnitCode}`);
  return null;
}

/**
 * Collect responsive stretch data for all ad units
 * @param {Array} adUnits - Array of ad units
 * @returns {Object} Object mapping ad unit codes to their space measurements
 */
function collectResponsiveStretchData(adUnits) {
  const stretchData = {};

  if (!adUnits || !isArray(adUnits)) {
    return stretchData;
  }

  adUnits.forEach(adUnit => {
    if (!adUnit.code) {
      return;
    }

    const element = findAdSlotElement(adUnit.code);
    const spaceData = calculateAdSlotSpace(element);

    if (spaceData) {
      stretchData[adUnit.code] = spaceData;
      logInfo(MODULE_NAME, `Collected stretch data for ${adUnit.code}:`, spaceData);
    }
  });

  return stretchData;
}

/**
 * Add responsive stretch data to ORTB2 fragments
 * @param {Object} reqBidsConfigObj - Bid request configuration object
 * @param {Object} stretchData - Collected stretch data
 * @param {Object} moduleConfig - Module configuration
 */
function addStretchDataToORTB2(reqBidsConfigObj, stretchData, moduleConfig) {
  const bidders = moduleConfig.params?.bidders || [];
  const globalEnabled = moduleConfig.params?.global !== false;
  const impLevelEnabled = moduleConfig.params?.impLevel !== false;

  // Add to global ORTB2 if enabled and no specific bidders configured
  if (globalEnabled && (isEmpty(bidders) || !isArray(bidders))) {
    const globalData = {
      site: {
        ext: {
          data: {
            responsiveStretch: {
              adUnits: stretchData,
              timestamp: Date.now()
            }
          }
        }
      }
    };

    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, globalData);
    logInfo(MODULE_NAME, 'Added responsive stretch data to global ORTB2');
  }

  // Add to specific bidders if configured
  if (isArray(bidders) && bidders.length > 0) {
    const bidderData = {
      site: {
        ext: {
          data: {
            responsiveStretch: {
              adUnits: stretchData,
              timestamp: Date.now()
            }
          }
        }
      }
    };

    const bidderConfig = Object.fromEntries(
      bidders.map(bidder => [bidder, bidderData])
    );

    mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, bidderConfig);
    logInfo(MODULE_NAME, `Added responsive stretch data to bidders: ${bidders.join(', ')}`);
  }

  // Add impression-level data if enabled
  if (impLevelEnabled && reqBidsConfigObj.adUnits) {
    reqBidsConfigObj.adUnits.forEach(adUnit => {
      const stretchInfo = stretchData[adUnit.code];
      if (stretchInfo) {
        const impData = {
          ext: {
            data: {
              responsiveStretch: stretchInfo
            }
          }
        };

        // Add wmax to banner object if maxAvailableWidth is available
        if (stretchInfo.maxAvailableWidth && stretchInfo.maxAvailableWidth !== Infinity) {
          impData.banner = {
            wmax: stretchInfo.maxAvailableWidth
          };
        }

        // Ensure ortb2Imp exists
        adUnit.ortb2Imp = adUnit.ortb2Imp || {};
        mergeDeep(adUnit.ortb2Imp, impData);

        logInfo(MODULE_NAME, `Added impression-level stretch data for ${adUnit.code}`);
      }
    });
  }
}

/**
 * Initialize the responsive stretch RTD provider
 * @param {Object} moduleConfig - Module configuration
 * @param {Object} userConsent - User consent data
 * @returns {boolean} Initialization success
 */
function init(moduleConfig, userConsent) {
  _moduleConfig = moduleConfig || {};

  logInfo(MODULE_NAME, 'Initializing responsive stretch provider with config:', _moduleConfig);

  // Validate configuration
  if (_moduleConfig.params) {
    const { bidders, global, impLevel, adUnitLevel } = _moduleConfig.params;

    if (bidders && !isArray(bidders)) {
      logWarn(MODULE_NAME, 'bidders parameter should be an array');
    }

    if (global !== undefined && typeof global !== 'boolean') {
      logWarn(MODULE_NAME, 'global parameter should be a boolean');
    }

    if (impLevel !== undefined && typeof impLevel !== 'boolean') {
      logWarn(MODULE_NAME, 'impLevel parameter should be a boolean');
    }

    if (adUnitLevel !== undefined && typeof adUnitLevel !== 'boolean') {
      logWarn(MODULE_NAME, 'adUnitLevel parameter should be a boolean');
    }
  }

  return true;
}

/**
 * Get bid request data and add responsive stretch information
 * @param {Object} reqBidsConfigObj - Bid request configuration object
 * @param {Function} callback - Callback function to call when done
 * @param {Object} moduleConfig - Module configuration
 * @param {Object} userConsent - User consent data
 */
function getBidRequestData(reqBidsConfigObj, callback, moduleConfig, userConsent) {
  logInfo(MODULE_NAME, 'Getting bid request data');

  try {
    const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits || [];

    if (isEmpty(adUnits)) {
      logWarn(MODULE_NAME, 'No ad units found');
      callback();
      return;
    }

    try {
      const stretchData = collectResponsiveStretchData(adUnits);

      if (!isEmpty(stretchData)) {
        addStretchDataToORTB2(reqBidsConfigObj, stretchData, moduleConfig || _moduleConfig);
        logInfo(MODULE_NAME, 'Successfully added responsive stretch data to bid request');
      } else {
        logWarn(MODULE_NAME, 'No stretch data collected');
      }
    } catch (error) {
      logError(MODULE_NAME, 'Error processing responsive stretch data:', error);
    }

    callback();
  } catch (error) {
    logError(MODULE_NAME, 'Error in getBidRequestData:', error);
    callback();
  }
}

/**
 * Get the maximum available width for an element by checking parent constraints
 * @param {HTMLElement} el - The element to check
 * @returns {number} Maximum available width in pixels
 */
function getMaxAvailableWidth(el) {
  let maxWidth = Infinity;
  let current = el;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const width = getBoundingClientRect(current).width;

    if (style.display !== 'contents' && style.position !== 'absolute') {
      maxWidth = Math.min(maxWidth, width);
    }

    current = current.parentElement;
  }

  return maxWidth;
}

/** @type {RtdSubmodule} */
export const responsiveStretchSubmodule = {
  /**
   * Used to link submodule with realTimeData
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Initialize the module
   * @function
   * @param {Object} moduleConfig - Module configuration
   * @param {Object} userConsent - User consent data
   * @returns {boolean} Initialization success
   */
  init: init,

  /**
   * Get bid request data and add responsive stretch information
   * @function
   * @param {Object} reqBidsConfigObj - Bid request configuration object
   * @param {Function} callback - Callback function
   * @param {Object} moduleConfig - Module configuration
   * @param {Object} userConsent - User consent data
   */
  getBidRequestData: getBidRequestData
};

function registerSubModule() {
  submodule('realTimeData', responsiveStretchSubmodule);
}

registerSubModule();

// Export for testing
export const internal = {
  calculateAdSlotSpace,
  findAdSlotElement,
  collectResponsiveStretchData,
  addStretchDataToORTB2,
  getMaxAvailableWidth
};
