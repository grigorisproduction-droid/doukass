import { Material, SheetType, PipeType } from '../types';

export const sheetTypes: Record<string, SheetType> = {
    black: {
        key: "black",
        label: "Μαύρη",
        density: 7850,
        thicknesses: [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.8, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]
    },
    galv: {
        key: "galv",
        label: "Γαλβανιζέ",
        density: 7850,
        thicknesses: [0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.8, 2, 2.5, 3]
    },
    kritharaki: {
        key: "kritharaki",
        label: "Κριθαράκι",
        density: 7850,
        thicknesses: [3, 4, 5, 6, 8, 10]
    },
    inox: {
        key: "inox",
        label: "Inox",
        density: 7900,
        thicknesses: [0.5, 0.6, 0.7, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8]
    },
    roll_red: {
        key: "roll_red",
        label: "Ρολό Κόκκινο",
        density: 7850,
        thicknesses: [0.5]
    },
    roll_grey: {
        key: "roll_grey",
        label: "Ρολό Γκρι",
        density: 7850,
        thicknesses: [0.5]
    },
    roll_white: {
        key: "roll_white",
        label: "Ρολό Λευκό",
        density: 7850,
        thicknesses: [0.5]
    },
    roll_green: {
        key: "roll_green",
        label: "Ρολό Πράσινο",
        density: 7850,
        thicknesses: [0.5]
    },
    roll_galv: {
        key: "roll_galv",
        label: "Ρολό Γαλβανιζέ",
        density: 7850,
        thicknesses: [0.5]
    }
};

export const pipeTypes: Record<string, PipeType> = {
    black: {
        key: "black",
        label: "Μαύρη",
        density: 7850,
        sizes: [
            { code: "21.3B", label: "Φ 21,3", diameter: 21.3, thicknesses: [1.5, 2, 2.3, 2.6, 3, 3.2, 3.6] },
            { code: "26.9B", label: "Φ 26,9", diameter: 26.9, thicknesses: [1.5, 2, 2.3, 2.6, 3, 3.2, 3.6] },
            { code: "33.7B", label: "Φ 33,7", diameter: 33.7, thicknesses: [2, 2.3, 2.6, 3, 3.2, 3.6, 4] },
            { code: "42.4B", label: "Φ 42,4", diameter: 42.4, thicknesses: [2, 2.3, 2.6, 3, 3.2, 3.6, 4] },
            { code: "48.3B", label: "Φ 48,3", diameter: 48.3, thicknesses: [2, 2.3, 2.6, 3, 3.2, 3.6, 4] },
            { code: "60.3B", label: "Φ 60,3", diameter: 60.3, thicknesses: [2, 2.6, 3, 3.2, 3.6, 4, 5] },
            { code: "76.1B", label: "Φ 76,1", diameter: 76.1, thicknesses: [2, 2.6, 3, 3.2, 3.6, 4, 5] },
            { code: "88.9B", label: "Φ 88,9", diameter: 88.9, thicknesses: [3, 3.2, 3.6, 4, 4.5, 5] },
            { code: "101.6B",label: "Φ 101,6",diameter: 101.6, thicknesses: [3, 3.2, 3.6, 4, 4.5, 5] },
            { code: "114.3B",label: "Φ 114,3",diameter: 114.3, thicknesses: [3, 3.2, 3.6, 4, 4.5, 5, 6] },
            { code: "139.7B",label: "Φ 139,7",diameter: 139.7, thicknesses: [2.5, 3, 4, 5, 6, 6.3, 8, 10] },
            { code: "168.3B",label: "Φ 168,3",diameter: 168.3, thicknesses: [3, 4, 5, 6, 6.3, 8, 10] },
            { code: "219.1B",label: "Φ 219,1",diameter: 219.1, thicknesses: [4, 5, 6, 6.3, 8, 10, 12] },
            { code: "244.5B",label: "Φ 244,5",diameter: 244.5, thicknesses: [4, 5, 6, 6.3, 8, 10, 12] },
            { code: "273.0B",label: "Φ 273,0",diameter: 273.0, thicknesses: [4, 5, 6, 6.3, 8, 10, 12] }
        ]
    },
    galv: {
        key: "galv",
        label: "Γαλβανιζέ",
        density: 7850,
        sizes: [
            { code: "21.3G", label: "Φ 21,3 γαλβ.", diameter: 21.3, thicknesses: [1.5, 1.8, 2, 2.3, 2.6, 3] },
            { code: "26.9G", label: "Φ 26,9 γαλβ.", diameter: 26.9, thicknesses: [1.5, 1.8, 2, 2.3, 2.6, 3] },
            { code: "33.7G", label: "Φ 33,7 γαλβ.", diameter: 33.7, thicknesses: [1.8, 2, 2.3, 2.6, 3] },
            { code: "42.4G", label: "Φ 42,4 γαλβ.", diameter: 42.4, thicknesses: [1.8, 2, 2.3, 2.6, 3] },
            { code: "48.3G", label: "Φ 48,3 γαλβ.", diameter: 48.3, thicknesses: [1.8, 2, 2.3, 2.6, 3] },
            { code: "60.3G", label: "Φ 60,3 γαλβ.", diameter: 60.3, thicknesses: [2, 2.3, 2.6, 3, 3.2, 3.6, 4] },
            { code: "76.1G", label: "Φ 76,1 γαλβ.", diameter: 76.1, thicknesses: [2, 2.3, 2.6, 3, 3.2, 3.6, 4] },
            { code: "88.9G", label: "Φ 88,9 γαλβ.", diameter: 88.9, thicknesses: [2.3, 2.6, 3, 3.2, 3.6, 4] },
            { code: "101.6G",label: "Φ 101,6 γαλβ.",diameter: 101.6, thicknesses: [2.3, 2.6, 3, 3.2, 3.6, 4] },
            { code: "114.3G",label: "Φ 114,3 γαλβ.",diameter: 114.3, thicknesses: [3, 3.2, 3.6, 4, 4.5, 5] },
            { code: "139.7G",label: "Φ 139,7 γαλβ.",diameter: 139.7, thicknesses: [3, 4, 5, 6, 6.3, 8] },
            { code: "168.3G",label: "Φ 168,3 γαλβ.",diameter: 168.3, thicknesses: [3, 4, 5, 6, 6.3, 8] },
            { code: "219.1G",label: "Φ 219,1 γαλβ.",diameter: 219.1, thicknesses: [4, 5, 6, 6.3, 8, 10] },
            { code: "244.5G",label: "Φ 244,5 γαλβ.",diameter: 244.5, thicknesses: [4, 5, 6, 6.3, 8, 10] },
            { code: "273.0G",label: "Φ 273,0 γαλβ.",diameter: 273.0, thicknesses: [4, 5, 6, 6.3, 8, 10] }
        ]
    }
};

export const materials: Record<string, Material> = {
    ipe: {
        label: "Δοκοί IPE",
        type: "wpm",
        requiresThickness: false,
        density: 7850,
        sizes: [
            { code: "IPE80",  label: "IPE 80",  wpm: 6.0 },
            { code: "IPE100", label: "IPE 100", wpm: 8.1 },
            { code: "IPE120", label: "IPE 120", wpm: 10.4 },
            { code: "IPE140", label: "IPE 140", wpm: 12.9 },
            { code: "IPE160", label: "IPE 160", wpm: 15.8 },
            { code: "IPE180", label: "IPE 180", wpm: 18.8 },
            { code: "IPE200", label: "IPE 200", wpm: 22.4 },
            { code: "IPE220", label: "IPE 220", wpm: 26.2 },
            { code: "IPE240", label: "IPE 240", wpm: 30.7 },
            { code: "IPE270", label: "IPE 270", wpm: 36.1 },
            { code: "IPE300", label: "IPE 300", wpm: 42.2 },
            { code: "IPE330", label: "IPE 330", wpm: 49.1 },
            { code: "IPE360", label: "IPE 360", wpm: 57.1 },
            { code: "IPE400", label: "IPE 400", wpm: 66.3 },
            { code: "IPE450", label: "IPE 450", wpm: 77.6 },
            { code: "IPE500", label: "IPE 500", wpm: 90.7 },
            { code: "IPE550", label: "IPE 550", wpm: 106.0 },
            { code: "IPE600", label: "IPE 600", wpm: 122.0 }
        ]
    },
    ipn: {
        label: "Δοκοί IPN",
        type: "wpm",
        requiresThickness: false,
        density: 7850,
        sizes: [
            { code: "IPN80",  label: "IPN 80",  wpm: 5.94 },
            { code: "IPN100", label: "IPN 100", wpm: 8.34 },
            { code: "IPN120", label: "IPN 120", wpm: 11.1 },
            { code: "IPN140", label: "IPN 140", wpm: 14.3 },
            { code: "IPN160", label: "IPN 160", wpm: 17.9 },
            { code: "IPN180", label: "IPN 180", wpm: 21.9 },
            { code: "IPN200", label: "IPN 200", wpm: 26.2 },
            { code: "IPN220", label: "IPN 220", wpm: 31.1 },
            { code: "IPN240", label: "IPN 240", wpm: 36.2 },
            { code: "IPN260", label: "IPN 260", wpm: 41.9 },
            { code: "IPN280", label: "IPN 280", wpm: 47.9 },
            { code: "IPN300", label: "IPN 300", wpm: 54.2 },
            { code: "IPN320", label: "IPN 320", wpm: 61.0 },
            { code: "IPN340", label: "IPN 340", wpm: 68.0 },
            { code: "IPN360", label: "IPN 360", wpm: 76.1 },
            { code: "IPN380", label: "IPN 380", wpm: 84.0 },
            { code: "IPN400", label: "IPN 400", wpm: 92.4 },
            { code: "IPN450", label: "IPN 450", wpm: 115.0 },
            { code: "IPN500", label: "IPN 500", wpm: 141.0 },
            { code: "IPN550", label: "IPN 550", wpm: 166.0 }
        ]
    },
    hea: {
        label: "Δοκοί HEA",
        type: "wpm",
        requiresThickness: false,
        density: 7850,
        sizes: [
            { code: "HEA100",  label: "HEA 100",  wpm: 16.7 },
            { code: "HEA120",  label: "HEA 120",  wpm: 19.9 },
            { code: "HEA140",  label: "HEA 140",  wpm: 24.7 },
            { code: "HEA160",  label: "HEA 160",  wpm: 30.4 },
            { code: "HEA180",  label: "HEA 180",  wpm: 35.5 },
            { code: "HEA200",  label: "HEA 200",  wpm: 42.3 },
            { code: "HEA220",  label: "HEA 220",  wpm: 50.5 },
            { code: "HEA240",  label: "HEA 240",  wpm: 60.3 },
            { code: "HEA260",  label: "HEA 260",  wpm: 68.2 },
            { code: "HEA280",  label: "HEA 280",  wpm: 76.4 },
            { code: "HEA300",  label: "HEA 300",  wpm: 88.3 },
            { code: "HEA320",  label: "HEA 320",  wpm: 97.6 },
            { code: "HEA340",  label: "HEA 340",  wpm: 105.0 },
            { code: "HEA360",  label: "HEA 360",  wpm: 112.0 },
            { code: "HEA400",  label: "HEA 400",  wpm: 125.0 },
            { code: "HEA450",  label: "HEA 450",  wpm: 140.0 },
            { code: "HEA500",  label: "HEA 500",  wpm: 155.0 },
            { code: "HEA550",  label: "HEA 550",  wpm: 166.0 },
            { code: "HEA600",  label: "HEA 600",  wpm: 178.0 }
        ]
    },
    heb: {
        label: "Δοκοί HEB",
        type: "wpm",
        requiresThickness: false,
        density: 7850,
        sizes: [
            { code: "HEB100",  label: "HEB 100",  wpm: 20.4 },
            { code: "HEB120",  label: "HEB 120",  wpm: 26.7 },
            { code: "HEB140",  label: "HEB 140",  wpm: 33.7 },
            { code: "HEB160",  label: "HEB 160",  wpm: 42.6 },
            { code: "HEB180",  label: "HEB 180",  wpm: 51.2 },
            { code: "HEB200",  label: "HEB 200",  wpm: 61.3 },
            { code: "HEB220",  label: "HEB 220",  wpm: 71.5 },
            { code: "HEB240",  label: "HEB 240",  wpm: 83.2 },
            { code: "HEB260",  label: "HEB 260",  wpm: 93.0 },
            { code: "HEB280",  label: "HEB 280",  wpm: 103.0 },
            { code: "HEB300",  label: "HEB 300",  wpm: 117.0 },
            { code: "HEB320",  label: "HEB 320",  wpm: 127.0 },
            { code: "HEB340",  label: "HEB 340",  wpm: 134.0 },
            { code: "HEB360",  label: "HEB 360",  wpm: 142.0 },
            { code: "HEB400",  label: "HEB 400",  wpm: 155.0 },
            { code: "HEB450",  label: "HEB 450",  wpm: 171.0 },
            { code: "HEB500",  label: "HEB 500",  wpm: 187.0 },
            { code: "HEB550",  label: "HEB 550",  wpm: 199.0 },
            { code: "HEB600",  label: "HEB 600",  wpm: 212.0 }
        ]
    },
    upn: {
        label: "Κανάλια UPN",
        type: "wpm",
        requiresThickness: false,
        density: 7850,
        sizes: [
            { code: "UPN50x25", label: "UPN 50 x 25", wpm: 3.86 },
            { code: "UPN50x38", label: "UPN 50 x 38", wpm: 5.59 },
            { code: "UPN60",    label: "UPN 60",      wpm: 5.07 },
            { code: "UPN65",    label: "UPN 65",      wpm: 7.09 },
            { code: "UPN80",    label: "UPN 80",      wpm: 8.64 },
            { code: "UPN100",   label: "UPN 100",     wpm: 10.6 },
            { code: "UPN120",   label: "UPN 120",     wpm: 13.4 },
            { code: "UPN140",   label: "UPN 140",     wpm: 16.0 },
            { code: "UPN160",   label: "UPN 160",     wpm: 18.8 },
            { code: "UPN180",   label: "UPN 180",     wpm: 22.0 },
            { code: "UPN200",   label: "UPN 200",     wpm: 25.3 },
            { code: "UPN220",   label: "UPN 220",     wpm: 29.4 },
            { code: "UPN240",   label: "UPN 240",     wpm: 33.2 },
            { code: "UPN260",   label: "UPN 260",     wpm: 37.9 },
            { code: "UPN280",   label: "UPN 280",     wpm: 41.8 },
            { code: "UPN300",   label: "UPN 300",     wpm: 46.2 },
            { code: "UPN320",   label: "UPN 320",     wpm: 59.5 },
            { code: "UPN350",   label: "UPN 350",     wpm: 60.6 },
            { code: "UPN380",   label: "UPN 380",     wpm: 63.1 },
            { code: "UPN400",   label: "UPN 400",     wpm: 71.8 }
        ]
    },

    square_hollow: {
        label: "Κοιλοδοκός τετράγωνος (μαύρος)",
        type: "rhs",
        requiresThickness: true,
        density: 7850,
        sizes: [
            { code: "20x20",  label: "20 x 20",  width: 20,  height: 20,  thicknesses: [1, 1.2, 1.5, 2, 2.5, 3] },
            { code: "25x25",  label: "25 x 25",  width: 25,  height: 25,  thicknesses: [1, 1.2, 1.5, 2, 2.5, 3, 4] },
            { code: "30x30",  label: "30 x 30",  width: 30,  height: 30,  thicknesses: [1.2, 1.5, 2, 2.5, 3, 4] },
            { code: "40x40",  label: "40 x 40",  width: 40,  height: 40,  thicknesses: [1.5, 2, 2.5, 3, 4] },
            { code: "50x50",  label: "50 x 50",  width: 50,  height: 50,  thicknesses: [2, 2.5, 3, 4, 5, 6] },
            { code: "60x60",  label: "60 x 60",  width: 60,  height: 60,  thicknesses: [2, 2.5, 3, 4, 5, 6] },
            { code: "80x80",  label: "80 x 80",  width: 80,  height: 80,  thicknesses: [2, 2.5, 3, 4, 5, 6, 8] },
            { code: "100x100",label: "100 x 100",width: 100, height: 100, thicknesses: [3, 4, 5, 6, 8, 10] },
            { code: "120x120",label: "120 x 120",width: 120, height: 120, thicknesses: [3, 4, 5, 6, 8, 10] },
            { code: "140x140",label: "140 x 140",width: 140, height: 140, thicknesses: [4, 5, 6, 8, 10] }
        ]
    },
    rect_hollow: {
        label: "Κοιλοδοκός ορθογώνιος (μαύρος)",
        type: "rhs",
        requiresThickness: true,
        density: 7850,
        sizes: [
            { code: "40x20",  label: "40 x 20",  width: 40,  height: 20,  thicknesses: [1, 1.2, 1.5, 2, 2.5, 3] },
            { code: "50x30",  label: "50 x 30",  width: 50,  height: 30,  thicknesses: [1, 1.2, 1.5, 2, 2.5, 3] },
            { code: "60x40",  label: "60 x 40",  width: 60,  height: 40,  thicknesses: [1.5, 2, 2.5, 3, 4] },
            { code: "80x40",  label: "80 x 40",  width: 80,  height: 40,  thicknesses: [1.5, 2, 2.5, 3, 4] },
            { code: "80x60",  label: "80 x 60",  width: 80,  height: 60,  thicknesses: [2, 2.5, 3, 4] },
            { code: "100x50", label: "100 x 50", width: 100, height: 50, thicknesses: [2, 2.5, 3, 4, 5, 6] },
            { code: "120x60", label: "120 x 60", width: 120, height: 60, thicknesses: [2, 2.5, 3, 4, 5, 6] },
            { code: "140x80", label: "140 x 80", width: 140, height: 80, thicknesses: [3, 4, 5, 6, 8] },
            { code: "160x80", label: "160 x 80", width: 160, height: 80, thicknesses: [3, 4, 5, 6, 8] },
            { code: "200x100",label: "200 x 100",width: 200, height: 100, thicknesses: [4, 5, 6, 8, 10] }
        ]
    },

    round_pipe_group: {
        label: "Σωλήνες στρογγυλές",
        type: "pipe_group",
        requiresThickness: true
    },

    angles_equal: {
        label: "Γωνίες ισόπλευρες (μαύρες)",
        type: "angle_equal",
        requiresThickness: true,
        density: 7850,
        sizes: [
            { code: "L20",  label: "20 x 20",  leg: 20,  thicknesses: [3, 4] },
            { code: "L25",  label: "25 x 25",  leg: 25,  thicknesses: [3, 4, 5, 6] },
            { code: "L30",  label: "30 x 30",  leg: 30,  thicknesses: [3, 4, 5, 6] },
            { code: "L35",  label: "35 x 35",  leg: 35,  thicknesses: [3, 4, 5, 6] },
            { code: "L40",  label: "40 x 40",  leg: 40,  thicknesses: [4, 5, 6, 7, 8] },
            { code: "L45",  label: "45 x 45",  leg: 45,  thicknesses: [4, 5, 6, 7, 8] },
            { code: "L50",  label: "50 x 50",  leg: 50,  thicknesses: [4, 5, 6, 8, 10] },
            { code: "L60",  label: "60 x 60",  leg: 60,  thicknesses: [5, 6, 8, 10, 12] },
            { code: "L70",  label: "70 x 70",  leg: 70,  thicknesses: [6, 7, 8, 10, 12] },
            { code: "L80",  label: "80 x 80",  leg: 80,  thicknesses: [6, 8, 10, 12, 15] },
            { code: "L90",  label: "90 x 90",  leg: 90,  thicknesses: [7, 8, 10, 12, 15] },
            { code: "L100", label: "100 x 100",leg: 100, thicknesses: [8, 10, 12, 15, 18] },
            { code: "L120", label: "120 x 120",leg: 120, thicknesses: [8, 10, 12, 15, 18] },
            { code: "L150", label: "150 x 150",leg: 150, thicknesses: [10, 12, 15, 18, 20] },
            { code: "L200", label: "200 x 200",leg: 200, thicknesses: [12, 15, 18, 20, 25] }
        ]
    },

    flat_bar: {
        label: "Λάμες (flat bars, μαύρες)",
        type: "flat",
        requiresThickness: true,
        density: 7850,
        sizes: [
            { code: "FB20",  label: "Λάμα 20 mm",  width: 20,  thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB25",  label: "Λάμα 25 mm",  width: 25,  thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB30",  label: "Λάμα 30 mm",  width: 30,  thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB40",  label: "Λάμα 40 mm",  width: 40,  thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB50",  label: "Λάμα 50 mm",  width: 50,  thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB60",  label: "Λάμα 60 mm",  width: 60,  thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB80",  label: "Λάμα 80 mm",  width: 80,  thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB100", label: "Λάμα 100 mm", width: 100, thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB120", label: "Λάμα 120 mm", width: 120, thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB150", label: "Λάμα 150 mm", width: 150, thicknesses: [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] },
            { code: "FB200", label: "Λάμα 200 mm", width: 200, thicknesses: [3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40] }
        ]
    },

    round_solid: {
        label: "Στρογγυλά μασίφ (μαύρα)",
        type: "solid_round",
        density: 7850,
        requiresThickness: false,
        sizes: [
            { code: "R6",   label: "Φ 6",   diameter: 6 },
            { code: "R8",   label: "Φ 8",   diameter: 8 },
            { code: "R10",  label: "Φ 10",  diameter: 10 },
            { code: "R12",  label: "Φ 12",  diameter: 12 },
            { code: "R14",  label: "Φ 14",  diameter: 14 },
            { code: "R16",  label: "Φ 16",  diameter: 16 },
            { code: "R18",  label: "Φ 18",  diameter: 18 },
            { code: "R20",  label: "Φ 20",  diameter: 20 },
            { code: "R22",  label: "Φ 22",  diameter: 22 },
            { code: "R25",  label: "Φ 25",  diameter: 25 },
            { code: "R28",  label: "Φ 28",  diameter: 28 },
            { code: "R30",  label: "Φ 30",  diameter: 30 },
            { code: "R32",  label: "Φ 32",  diameter: 32 },
            { code: "R35",  label: "Φ 35",  diameter: 35 },
            { code: "R40",  label: "Φ 40",  diameter: 40 },
            { code: "R45",  label: "Φ 45",  diameter: 45 },
            { code: "R50",  label: "Φ 50",  diameter: 50 },
            { code: "R55",  label: "Φ 55",  diameter: 55 },
            { code: "R60",  label: "Φ 60",  diameter: 60 },
            { code: "R65",  label: "Φ 65",  diameter: 65 },
            { code: "R70",  label: "Φ 70",  diameter: 70 },
            { code: "R75",  label: "Φ 75",  diameter: 75 },
            { code: "R80",  label: "Φ 80",  diameter: 80 },
            { code: "R90",  label: "Φ 90",  diameter: 90 },
            { code: "R100", label: "Φ 100", diameter: 100 },
            { code: "R110", label: "Φ 110", diameter: 110 },
            { code: "R120", label: "Φ 120", diameter: 120 }
        ]
    },

    square_solid: {
        label: "Τετράγωνα μασίφ (μαύρα)",
        type: "solid_square",
        density: 7850,
        requiresThickness: false,
        sizes: [
            { code: "SQ8",   label: "8 x 8",   side: 8 },
            { code: "SQ10",  label: "10 x 10", side: 10 },
            { code: "SQ12",  label: "12 x 12", side: 12 },
            { code: "SQ14",  label: "14 x 14", side: 14 },
            { code: "SQ15",  label: "15 x 15", side: 15 },
            { code: "SQ16",  label: "16 x 16", side: 16 },
            { code: "SQ18",  label: "18 x 18", side: 18 },
            { code: "SQ20",  label: "20 x 20", side: 20 },
            { code: "SQ22",  label: "22 x 22", side: 22 },
            { code: "SQ25",  label: "25 x 25", side: 25 },
            { code: "SQ30",  label: "30 x 30", side: 30 },
            { code: "SQ35",  label: "35 x 35", side: 35 },
            { code: "SQ40",  label: "40 x 40", side: 40 },
            { code: "SQ45",  label: "45 x 45", side: 45 },
            { code: "SQ50",  label: "50 x 50", side: 50 },
            { code: "SQ60",  label: "60 x 60", side: 60 },
            { code: "SQ70",  label: "70 x 70", side: 70 },
            { code: "SQ80",  label: "80 x 80", side: 80 },
            { code: "SQ90",  label: "90 x 90", side: 90 },
            { code: "SQ100", label: "100 x 100", side: 100 }
        ]
    },

    sheets: {
        label: "Λαμαρίνες (Sheets)",
        type: "sheet_group",
        requiresThickness: true
    }
};

// Standard raw sheet stock sizes as sold by suppliers (width x length, in meters)
export const standardSheetSizes: { code: string; label: string }[] = [
    { code: "2x1",     label: "2 x 1" },
    { code: "2.5x1.25",label: "2,5 x 1,25" },
    { code: "3x1.5",   label: "3 x 1,5" },
    { code: "4x2",     label: "4 x 2" },
    { code: "6x1.5",   label: "6 x 1,5" },
    { code: "6x2",     label: "6 x 2" }
];
