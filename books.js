/*
  Add one book object per title to this array.
  Access tokens are public because this is a static website.
*/
window.GARDEN_BOOKS = [
  {
    slug: "the-gentle-table",
    isDemo: true,
    title: "The Gentle Table",
    subtitle: "Small rituals for eating well, every day",
    author: "Garden Reading Room",
    category: "Everyday nourishment",
    description: "A short, practical field guide to feeding yourself with a little more care. No rules to memorize—just steady ideas for making everyday meals feel good.",
    cover: {
      background: "linear-gradient(150deg, #d8e0bd 0%, #adc3a2 52%, #79947d 100%)",
      ink: "#274b3b",
      eyebrow: "A SMALL GUIDE TO",
      motif: "A softer way to eat"
    },
    readingMinutes: 12,
    pdfPath: "",
    accessTokens: [],
    chapters: [
      {
        slug: "begin-with-what-you-have",
        title: "Begin with what you have",
        paragraphs: [
          "A nourishing meal does not need a perfect plan. It can begin with the half-bunch of greens in the drawer, a pot of rice from yesterday, or the soup you meant to freeze. Start where you are; the kitchen is not an exam.",
          "Look for one thing that will make the meal feel more complete. A handful of beans adds staying power. A lemon wakes up something soft and warm. A spoonful of yogurt can turn leftovers into lunch. Small additions count.",
          "When the day is crowded, make the next kind choice—not the ideal choice. Keeping a few dependable foods within reach is a form of care for your future self."
        ]
      },
      {
        slug: "make-room-for-the-senses",
        title: "Make room for the senses",
        paragraphs: [
          "Food is more than a list of nutrients. The crisp edge of toast, the smell of ginger in a warm pan, and the first cool sip of water all help a meal become a moment you can actually inhabit.",
          "Try adding contrast: something crunchy beside something soft, a bright note beside a mellow one. Texture and color can make a simple bowl feel generous without making it complicated.",
          "You do not have to eat slowly in a perfect, quiet room. Even pausing for one breath before the first bite can bring you back to the table."
        ]
      },
      {
        slug: "a-rhythm-not-a-rulebook",
        title: "A rhythm, not a rulebook",
        paragraphs: [
          "Routines are useful when they make life easier. A pot of oats on cool mornings, chopped vegetables ready for the week, or a familiar snack after a long walk can offer a comforting shape to the day.",
          "But a rhythm should leave room for real life. Appetite changes. Plans shift. Some days call for a proper meal; others call for whatever is close and kind. Flexibility is not a failure of the plan.",
          "Notice what helps you feel cared for, then keep the parts that work. Your table can be practical, imperfect, and still a lovely place to return to."
        ]
      }
    ]
  }
];
