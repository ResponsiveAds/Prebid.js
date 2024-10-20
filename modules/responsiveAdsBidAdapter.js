import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import  { ortbConverter } from '../libraries/ortbConverter/converter.js'
import {
  isArray,
  replaceAuctionPrice,
  triggerPixel,
  logMessage,
  deepSetValue,
  getBidIdParameter
} from '../src/utils.js';


const BIDDER_CODE = 'responsiveAdsBidAdapter';
const ENDPOINT_URL = 'https://radprimoz.eu.loclx.io/bid';

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
    const data = converter.toORTB({bidRequests, bidderRequest})
    // you may need to adjust `data` to suit your needs - see "customization" below
    return [{
      method: 'POST',
      url: ENDPOINT_URL,
      data: data,
      options: {
        contentType: 'application/json',
      },
      bidderRequest
    }]
  },
  interpretResponse: function(response, request) {
    if (response.body) {
      const bids = converter.fromORTB({ response: response.body, request: request.data }).bids;
      return bids;
    }
    return [];
  },

  onBidWon: (bid) => {
    logMessage('onBidWon', bid);
  }

};

registerBidder(spec);
