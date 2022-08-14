const
  chai = require('chai'),
  expect = chai.expect,
  { itm2wgs84, wgs842itm, ics2wgs84, wgs842ics } = require('../src/index.js');

describe('converters', () => {

  it('converts itm to wgs84 correctly', () => {
    expect(itm2wgs84(194140, 385060).map(v => v.toFixed(7)))
      .to.be.an('array')
      .and.to.have.ordered.members([29.553103541791266.toFixed(7), 34.94329309576616.toFixed(7)]);
  });

  it('converts wgs84 to itm to correctly', () => {
    expect(wgs842itm(32.0, 35.0))
      .to.be.an('array')
      .and.to.have.ordered.members([200131, 656329]);
  });

  it('converts ics to wgs84 correctly', () => {
    expect(ics2wgs84(144140, 885060).map(v => v.toFixed(7)))
      .to.be.an('array')
      .and.to.have.ordered.members([29.553036125579155.toFixed(7), 34.943337203496604.toFixed(7)]);
  });

  it('converts wgs84 to ics to correctly', () => {
    expect(wgs842ics(29.553036125579155, 34.943337203496604))
      .to.be.an('array')
      .and.to.have.ordered.members([144140, 885060]);
  });

});
