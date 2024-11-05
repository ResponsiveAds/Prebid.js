import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import  { ortbConverter } from '../libraries/ortbConverter/converter.js'
import {
  isArray,
  replaceAuctionPrice,
  triggerPixel,
  logMessage,
  deepSetValue,
  getBidIdParameter,
  canAccessWindowTop,
  getSafeframeGeometry,
  getWindowSelf,
  getWindowTop,
  inIframe,
  isSafeFrameWindow,
} from '../src/utils.js';


const BIDDER_CODE = 'responsiveAdsBidAdapter';
const ENDPOINT_URL = 'https://ve60c4xzl9.execute-api.us-east-1.amazonaws.com/default/fake-prebidjs';

const converter = ortbConverter({
    context: {
        // `mediaType` is required for the `setResponseMediaType` processor
        mediaType: BANNER,
        // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
        netRevenue: true,    // or false if your adapter should set bidResponse.netRevenue = false
        ttl: 30              // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
    }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function(bid) {
    // validate the bid request
    return !!(bid.params && bid.params.placementId);
  },
  buildRequests: function(bidRequests, bidderRequest) {
    console.log('isSafeFrameWindow', isSafeFrameWindow());
    //we only want to bid if we are not in a safeframe
    if (isSafeFrameWindow()) {
      return;
    }

    const data = converter.toORTB({bidRequests, bidderRequest})
    return [{
      method: 'POST',
      url: ENDPOINT_URL,
      data: data,
      options: {
        contentType: 'application/json',
        withCredentials: false
      },
      bidderRequest
    }]
  },
  interpretResponse: function(response, request) {
    if (response.body) {
      const res = converter.fromORTB({ response: response.body, request: request.data });
      const bids = res.bids;
      logMessage('interpretResponse', bids);
      return bids;
    }
    return [];
  },

  onBidWon: (bid) => {
    logMessage('onBidWon', bid);
  }

};

registerBidder(spec);
