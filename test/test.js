const
  chai = require('chai'),
  expect = chai.expect,
  { itm2wgs84, wgs842itm, ics2wgs84, wgs842ics } = require('../src/index.js');

describe('converters', () => {

  it('converts itm to wgs84 correctly', () => {
    expect(itm2wgs84(194140, 385060))
      .to.be.an('array')
      .and.to.have.ordered.members(['29.5531035', '34.9432931']);
  });

  it('converts wgs84 to itm to correctly', () => {
    expect(wgs842itm(32.0, 35.0))
      .to.be.an('array')
      .and.to.have.ordered.members([200131, 656329]);
  });

  it('converts ics to wgs84 correctly', () => {
    expect(ics2wgs84(144140, 885060))
      .to.be.an('array')
      .and.to.have.ordered.members(['29.5530361', '34.9433372']);
  });

  it('converts wgs84 to ics to correctly', () => {
    expect(wgs842ics(29.553036125579155, 34.943337203496604))
      .to.be.an('array')
      .and.to.have.ordered.members([144140, 885060]);
  });

});
