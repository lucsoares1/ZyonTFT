function pendingSocialNotices(social) {
  if (!social?.user) return [];
  return [
    ...(social.friendRequests || []).filter(r => r.incoming).map(r => ({
      key: `friend:${r.id}`, id: r.id, kind: 'friend',
      name: r.profile?.display_name || 'Um jogador',
    })),
    ...(social.invites || []).filter(r => r.incoming).map(r => ({
      key: `invite:${r.id}`, id: r.id, kind: 'invite',
      name: r.profile?.display_name || 'Um jogador',
    })),
  ];
}
class SocialNoticeTracker {
  constructor() { this.user = null; this.seen = new Set(); }
  update(social) {
    if (this.user !== social?.user?.id) {
      this.user = social?.user?.id || null;
      this.seen.clear();
    }
    return pendingSocialNotices(social).filter(n => {
      if (this.seen.has(n.key)) return false;
      this.seen.add(n.key);
      return true;
    });
  }
}
module.exports = { pendingSocialNotices, SocialNoticeTracker };
