// Maps program titles to their thumbnail images in /public/images/
export const PROGRAM_IMAGES: Record<string, string> = {
  'AI in Software Engineering':        '/images/Development.jpeg',
  'AI in Cyber Security & Intelligence':'/images/Cybersecurity.jpeg',
  'AI in Data Analytics':              '/images/Data%20Analytics.jpeg',
  'AI in Cloud & DevOps':              '/images/Cloud%20and%20DevOps.jpeg',
  'AI in Product Management':          '/images/Product%20Management.jpeg',
  'AI in Product Design':              '/images/Products%20design.jpeg',
  'General AI':                        '/images/Data.jpeg',
}

export function getProgramImage(title: string): string {
  return PROGRAM_IMAGES[title] ?? '/images/Development.jpeg'
}
