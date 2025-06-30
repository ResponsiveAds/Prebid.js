import { expect } from 'chai';
import { responsiveStretchSubmodule, internal } from 'modules/responsiveStretchProvider.js';
import { getViewportSize } from 'libraries/viewport/viewport.js';

const { calculateAdSlotSpace, findAdSlotElement, collectResponsiveStretchData, addStretchDataToORTB2 } = internal;

describe('responsiveStretchProvider', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('module registration', function () {
    it('should be registered as an RTD submodule', function () {
      expect(responsiveStretchSubmodule.name).to.equal('responsiveStretch');
      expect(responsiveStretchSubmodule.init).to.be.a('function');
      expect(responsiveStretchSubmodule.getBidRequestData).to.be.a('function');
    });
  });

  describe('init', function () {
    it('should initialize successfully with valid config', function () {
      const config = {
        params: {
          bidders: ['appnexus', 'rubicon'],
          global: true,
          impLevel: true
        }
      };
      const result = responsiveStretchSubmodule.init(config);
      expect(result).to.be.true;
    });

    it('should initialize successfully with empty config', function () {
      const result = responsiveStretchSubmodule.init({});
      expect(result).to.be.true;
    });

    it('should handle undefined config', function () {
      const result = responsiveStretchSubmodule.init(undefined);
      expect(result).to.be.true;
    });
  });

  describe('calculateAdSlotSpace', function () {
    let mockElement;

    beforeEach(function () {
      mockElement = {
        getBoundingClientRect: sandbox.stub().returns({
          width: 300,
          height: 250,
          top: 100,
          left: 50,
          right: 350,
          bottom: 350
        }),
        parentElement: {
          getBoundingClientRect: sandbox.stub().returns({
            width: 1200,
            height: 800
          })
        }
      };

      sandbox.stub(getViewportSize, 'getViewportSize').returns({
        width: 1920,
        height: 1080
      });
    });

    it('should calculate correct space measurements', function () {
      const result = calculateAdSlotSpace(mockElement);

      expect(result).to.be.an('object');
      expect(result.width).to.equal(300);
      expect(result.height).to.equal(250);
      expect(result.stretchLeft).to.equal(50);
      expect(result.stretchRight).to.equal(1570); // 1920 - 350
      expect(result.stretchUp).to.equal(100);
      expect(result.stretchDown).to.equal(730); // 1080 - 350
      expect(result.isVisible).to.be.true;
      expect(result.parentWidth).to.equal(1200);
      expect(result.parentHeight).to.equal(800);
    });

    it('should handle null element', function () {
      const result = calculateAdSlotSpace(null);
      expect(result).to.be.null;
    });

    it('should categorize stretch potential correctly', function () {
      const result = calculateAdSlotSpace(mockElement);

      expect(result.stretchPotential).to.be.an('object');
      expect(result.stretchPotential.horizontal).to.be.oneOf(['low', 'medium', 'high']);
      expect(result.stretchPotential.vertical).to.be.oneOf(['low', 'medium', 'high']);
    });
  });

  describe('findAdSlotElement', function () {
    let mockElement;

    beforeEach(function () {
      mockElement = document.createElement('div');
      sandbox.stub(document, 'getElementById');
      sandbox.stub(document, 'querySelector');
    });

    it('should find element by ID', function () {
      document.getElementById.withArgs('test-ad-unit').returns(mockElement);

      const result = findAdSlotElement('test-ad-unit');
      expect(result).to.equal(mockElement);
    });

    it('should try multiple selectors', function () {
      document.getElementById.returns(null);
      document.querySelector.onFirstCall().returns(null);
      document.querySelector.onSecondCall().returns(mockElement);

      const result = findAdSlotElement('test-ad-unit');
      expect(result).to.equal(mockElement);
    });

    it('should return null if element not found', function () {
      document.getElementById.returns(null);
      document.querySelector.returns(null);

      const result = findAdSlotElement('nonexistent-ad-unit');
      expect(result).to.be.null;
    });
  });

  describe('collectResponsiveStretchData', function () {
    let mockElement;

    beforeEach(function () {
      mockElement = document.createElement('div');
      sandbox.stub(internal, 'findAdSlotElement');
      sandbox.stub(internal, 'calculateAdSlotSpace');
    });

    it('should collect data for valid ad units', function () {
      const adUnits = [
        { code: 'ad-unit-1' },
        { code: 'ad-unit-2' }
      ];

      internal.findAdSlotElement.withArgs('ad-unit-1').returns(mockElement);
      internal.findAdSlotElement.withArgs('ad-unit-2').returns(mockElement);

      internal.calculateAdSlotSpace.returns({ width: 300, height: 250 });

      const result = collectResponsiveStretchData(adUnits);

      expect(result).to.be.an('object');
      expect(result['ad-unit-1']).to.deep.equal({ width: 300, height: 250 });
      expect(result['ad-unit-2']).to.deep.equal({ width: 300, height: 250 });
    });

    it('should handle empty ad units array', function () {
      const result = collectResponsiveStretchData([]);
      expect(result).to.deep.equal({});
    });

    it('should handle invalid input', function () {
      expect(collectResponsiveStretchData(null)).to.deep.equal({});
      expect(collectResponsiveStretchData(undefined)).to.deep.equal({});
      expect(collectResponsiveStretchData('invalid')).to.deep.equal({});
    });
  });

  describe('addStretchDataToORTB2', function () {
    let reqBidsConfigObj;
    let stretchData;
    let moduleConfig;

    beforeEach(function () {
      reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {}
        },
        adUnits: [
          { code: 'ad-unit-1', ortb2Imp: {} }
        ]
      };

      stretchData = {
        'ad-unit-1': { width: 300, height: 250 }
      };

      moduleConfig = {
        params: {
          bidders: ['appnexus'],
          global: true,
          impLevel: true
        }
      };

      sandbox.stub(getViewportSize, 'getViewportSize').returns({
        width: 1920,
        height: 1080
      });
    });

    it('should add data to specific bidders', function () {
      addStretchDataToORTB2(reqBidsConfigObj, stretchData, moduleConfig);

      expect(reqBidsConfigObj.ortb2Fragments.bidder.appnexus).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.bidder.appnexus.site.ext.data.responsiveStretch).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.bidder.appnexus.site.ext.data.responsiveStretch.adUnits).to.deep.equal(stretchData);
    });

    it('should add data to global ORTB2 when no bidders specified', function () {
      moduleConfig.params.bidders = [];

      addStretchDataToORTB2(reqBidsConfigObj, stretchData, moduleConfig);

      expect(reqBidsConfigObj.ortb2Fragments.global.site.ext.data.responsiveStretch).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.global.site.ext.data.responsiveStretch.adUnits).to.deep.equal(stretchData);
    });

    it('should add impression-level data', function () {
      addStretchDataToORTB2(reqBidsConfigObj, stretchData, moduleConfig);

      expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.responsiveStretch).to.exist;
      expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.data.responsiveStretch).to.deep.equal(stretchData['ad-unit-1']);
    });

    it('should respect configuration flags', function () {
      moduleConfig.params.impLevel = false;

      addStretchDataToORTB2(reqBidsConfigObj, stretchData, moduleConfig);

      expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext?.data?.responsiveStretch).to.be.undefined;
    });
  });

  describe('getBidRequestData', function () {
    let callback;
    let reqBidsConfigObj;

    beforeEach(function () {
      callback = sandbox.stub();
      reqBidsConfigObj = {
        ortb2Fragments: {
          global: {},
          bidder: {}
        },
        adUnits: [
          { code: 'ad-unit-1' }
        ]
      };

      sandbox.stub(internal, 'collectResponsiveStretchData').returns({
        'ad-unit-1': { width: 300, height: 250 }
      });
      sandbox.stub(internal, 'addStretchDataToORTB2');
    });

    it('should call callback after processing', function (done) {
      const config = { params: { bidders: ['appnexus'] } };

      responsiveStretchSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        expect(callback.called).to.be.false; // We're using a different callback here
        done();
      }, config);
    });

    it('should handle errors gracefully', function (done) {
      internal.collectResponsiveStretchData.throws(new Error('Test error'));

      responsiveStretchSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        // Should not throw and should call callback
        done();
      }, {});
    });

    it('should handle empty ad units', function (done) {
      reqBidsConfigObj.adUnits = [];

      responsiveStretchSubmodule.getBidRequestData(reqBidsConfigObj, () => {
        expect(internal.collectResponsiveStretchData.called).to.be.false;
        done();
      }, {});
    });
  });
});
