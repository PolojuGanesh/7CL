function RoomProviderStatus({ message, action }) {
  return (
    <main className="room-provider-status">
      <section>
        <a className="brand-mark" href="/">7CL</a>
        <p>{message}</p>
        {action}
      </section>
    </main>
  );
}

export { RoomProviderStatus };
