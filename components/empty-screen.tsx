import { UseChatHelpers } from 'ai/react'
import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: 'Zeit eintragen',
    message: 'Ich habe von 9 bis 11 Uhr an dem Projekt gearbeitet'
  },
  {
    heading: 'Tagesübersicht',
    message: 'Was habe ich heute alles gearbeitet?'
  },
  {
    heading: 'Statistik',
    message: 'Wie viel Zeit habe ich diese Woche mit Meetings verbracht?'
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">
          Willkommen bei ChronoMind!
        </h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          ChronoMind hilft dir, deine Zeit zu erfassen und den Überblick zu behalten.{' '}
          Beschreibe einfach, was du gemacht hast — der KI-Assistent erstellt daraus
          Zeiteinträge.
        </p>
        <p className="leading-normal text-muted-foreground">
          Starte ein Gespräch oder probiere folgende Beispiele:
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
