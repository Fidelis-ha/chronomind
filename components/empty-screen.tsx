import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: 'Zeit erfassen',
    message: `Erfasse 2 Stunden Projektarbeit von 9:00 bis 11:00 Uhr`
  },
  {
    heading: 'Einträge anzeigen',
    message: 'Was habe ich heute schon gemacht?'
  },
  {
    heading: 'Eintrag bearbeiten',
    message: 'Ändere den letzten Eintrag auf "Meeting Vorbereitung"'
  }
]

interface EmptyScreenProps {
  setInput: (input: string) => void
}

export function EmptyScreen({ setInput }: EmptyScreenProps) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">
          ChronoMind – KI-gestützte Zeiterfassung
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          Ich helfe dir bei der Zeiterfassung. Beschreibe einfach was du gemacht
          hast und ich erstelle den Eintrag für dich.
        </p>
        <p className="leading-normal text-muted-foreground">
          Probiere diese Beispiele aus:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
