// Dataset Quiz IsyaraTalk - Duolingo Style
// Struktur: Levels -> Questions (Choice, Camera, Match)

const QUIZ_DATA = {
    levels: [
        {
            id: 1,
            name: "Alphabet Dasar",
            description: "Kenali huruf-huruf dasar dalam bahasa isyarat.",
            xp_reward: 100,
            questions: [
                {
                    id: "q1_a",
                    type: "choice",
                    question: "Manakah isyarat untuk huruf 'A'?",
                    options: [
                        { id: "a", image: "js/Image/images_quest/a.png", label: "A" },
                        { id: "b", image: "js/Image/images_quest/b.png", label: "B" },
                        { id: "c", image: "js/Image/images_quest/c.png", label: "C" },
                        { id: "d", image: "js/Image/images_quest/d.png", label: "D" }
                    ],
                    answer: "a"
                },
                {
                    id: "q1_b",
                    type: "choice",
                    question: "Huruf apakah ini?",
                    image: "js/Image/images_quest/b.png",
                    options: [
                        { id: "a", text: "A" },
                        { id: "b", text: "B" },
                        { id: "c", text: "C" },
                        { id: "g", text: "G" }
                    ],
                    answer: "b"
                },
                {
                    id: "q1_c_cam",
                    type: "camera",
                    question: "Peragakan isyarat untuk huruf 'C'",
                    targetLabel: "C",
                    hint: "Bentuk tangan seperti huruf C (setengah lingkaran)"
                },
                {
                    id: "q1_d",
                    type: "choice",
                    question: "Manakah isyarat untuk huruf 'D'?",
                    options: [
                        { id: "b", image: "js/Image/images_quest/b.png", label: "B" },
                        { id: "d", image: "js/Image/images_quest/d.png", label: "D" },
                        { id: "o", image: "js/Image/images_quest/o.png", label: "O" },
                        { id: "p", image: "js/Image/images_quest/p.png", label: "P" }
                    ],
                    answer: "d"
                },
                {
                    id: "q1_f",
                    type: "choice",
                    question: "Huruf apakah ini?",
                    image: "js/Image/images_quest/f.png",
                    options: [
                        { id: "f", text: "F" },
                        { id: "g", text: "G" },
                        { id: "h", text: "H" },
                        { id: "i", text: "I" }
                    ],
                    answer: "f"
                },
                {
                    id: "q1_g",
                    type: "choice",
                    question: "Manakah isyarat untuk huruf 'G'?",
                    options: [
                        { id: "g", image: "js/Image/images_quest/g.png", label: "G" },
                        { id: "j", image: "js/Image/images_quest/j.png", label: "J" },
                        { id: "k", image: "js/Image/images_quest/k.png", label: "K" },
                        { id: "m", image: "js/Image/images_quest/m.png", label: "M" }
                    ],
                    answer: "g"
                },
                {
                    id: "q1_h_cam",
                    type: "camera",
                    question: "Peragakan isyarat untuk huruf 'H'",
                    targetLabel: "H",
                    hint: "Dua jari (telunjuk & tengah) menunjuk ke samping"
                },
                {
                    id: "q1_i",
                    type: "choice",
                    question: "Huruf apakah ini?",
                    image: "js/Image/images_quest/i.png",
                    options: [
                        { id: "i", text: "I" },
                        { id: "j", text: "J" },
                        { id: "y", text: "Y" },
                        { id: "z", text: "Z" }
                    ],
                    answer: "i"
                },
                {
                    id: "q1_j",
                    type: "choice",
                    question: "Manakah isyarat untuk huruf 'J'?",
                    options: [
                        { id: "j", image: "js/Image/images_quest/j.png", label: "J" },
                        { id: "k", image: "js/Image/images_quest/k.png", label: "K" },
                        { id: "m", image: "js/Image/images_quest/m.png", label: "M" },
                        { id: "o", image: "js/Image/images_quest/o.png", label: "O" }
                    ],
                    answer: "j"
                },
                {
                    id: "q1_k",
                    type: "choice",
                    question: "Huruf apakah ini?",
                    image: "js/Image/images_quest/k.png",
                    options: [
                        { id: "k", text: "K" },
                        { id: "v", text: "V" },
                        { id: "w", text: "W" },
                        { id: "x", text: "X" }
                    ],
                    answer: "k"
                },
                {
                    id: "q1_m_cam",
                    type: "camera",
                    question: "Peragakan isyarat untuk huruf 'M'",
                    targetLabel: "M",
                    hint: "Tiga jari mengepal di atas ibu jari"
                },
                {
                    id: "q1_o",
                    type: "choice",
                    question: "Huruf apakah ini?",
                    image: "js/Image/images_quest/o.png",
                    options: [
                        { id: "o", text: "O" },
                        { id: "c", text: "C" },
                        { id: "d", text: "D" },
                        { id: "q", text: "Q" }
                    ],
                    answer: "o"
                },
                {
                    id: "q1_p",
                    type: "choice",
                    question: "Manakah isyarat untuk huruf 'P'?",
                    options: [
                        { id: "p", image: "js/Image/images_quest/p.png", label: "P" },
                        { id: "b", image: "js/Image/images_quest/b.png", label: "B" },
                        { id: "f", image: "js/Image/images_quest/f.png", label: "F" },
                        { id: "a", image: "js/Image/images_quest/a.png", label: "A" }
                    ],
                    answer: "p"
                },
                {
                    id: "q1_q",
                    type: "choice",
                    question: "Huruf apakah ini?",
                    image: "js/Image/images_quest/q.png",
                    options: [
                        { id: "q", text: "Q" },
                        { id: "g", text: "G" },
                        { id: "y", text: "Y" },
                        { id: "z", text: "Z" }
                    ],
                    answer: "q"
                },
                {
                    id: "q1_u_cam",
                    type: "camera",
                    question: "Peragakan isyarat untuk huruf 'U'",
                    targetLabel: "U",
                    hint: "Dua jari (telunjuk & tengah) tegak rapat"
                }
            ]
        }
    ]
};

export default QUIZ_DATA;
