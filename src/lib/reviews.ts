/**
 * The best reviews members have left on Google, shown word for word. The
 * wording comes straight from the owner's Google listing.
 */
export type Review = { quote: string; name: string; when: string };

export const REVIEWS: Review[] = [
  {
    quote:
      "A very peaceful and well-maintained library with a great collection of books. The environment is quiet and perfect for studying, reading, and research. The staff is helpful and friendly, and the facilities are clean and organized. Highly recommended for students and book lovers looking for a comfortable place to learn and explore new ideas.",
    name: "Mish Gaur",
    when: "3 months ago",
  },
  {
    quote:
      "It was a peaceful experience, the staff is friendly, helpful, and professional. The atmosphere is quiet, comfortable, and perfect for focused learning.",
    name: "A.K.",
    when: "3 months ago",
  },
  {
    quote:
      "A peaceful and calm study environment, fully equipped with modern facilities and high-speed internet",
    name: "Mohammad Mohatram",
    when: "10 months ago",
  },
  {
    quote:
      "It's been a really good Library, ambience is very good and environment is so good and no unnecessary noise around here. Would really want everyone to come and see once.",
    name: "Mohd Saif",
    when: "a week ago",
  },
  {
    quote: "Great initiative",
    name: "Abdul Quddus Ansari",
    when: "6 months ago",
  },
  {
    quote:
      "Amtul Noor Library is an excellent resource for competitive exam aspirants. With a serene atmosphere, it\u2019s perfect for focused learning. The library boasts clean washrooms, no disturbance from surroundings ensuring a comfortable experience. Professional management provides a safe and caring environment.",
    name: "Shah Jahan",
    when: "10 months ago",
  },
];