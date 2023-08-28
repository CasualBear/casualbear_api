class TeamHandling {
  constructor(socket) {
    this.socket = socket;
  }

  emitTeamUpdate(data) {
    // Use this.socket to emit events to the specific socket
    this.socket.emit("teamUpdate", data);
  }

  // Other methods for handling team-related events
}

module.exports = Team;
