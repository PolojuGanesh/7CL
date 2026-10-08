export function nextBidAmountLakhs(currentBidLakhs, highestBidderId, incrementLakhs) {
  return highestBidderId ? currentBidLakhs + incrementLakhs : currentBidLakhs;
}
