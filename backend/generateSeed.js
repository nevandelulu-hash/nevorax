import WDK from "@tetherto/wdk"

const seed = WDK.getRandomSeedPhrase()

console.log("\nYour WDK Seed Phrase:\n")
console.log(seed)
console.log("\nSAVE THIS IN YOUR .env FILE\n")