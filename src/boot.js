/* Boot: paint the map, start the live state, draw, and tick once a second. */
Paint.install();
Live.init();
fromHash();
setInterval(() => {
  const now = Date.now();
  if (S.mode === 'ops' && $('wall') && Live.tick(now)) liveRefresh();
  updateTimers(now);
}, 1000);
