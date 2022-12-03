export interface DrugbankId {
        primary: boolean;
        $: string;
    }

    export interface Groups {
        group: string[];
    }

    export interface Article {
        ref_id: string;
        pubmed_id: string;
        citation: string;
    }

    export interface Articles {
        article: Article[];
    }

    export interface Textbooks {
    }

    export interface Link {
        ref_id: string;
        title: string;
        url: string;
    }

    export interface Links {
        link: Link[];
    }

    export interface Attachments {
    }

    export interface GeneralReferences {
        articles: Articles;
        textbooks: Textbooks;
        links: Links;
        attachments: Attachments;
    }

    export interface Classification {
        description: string;
        direct_parent: string;
        kingdom: string;
        superclass: string;
        class: string;
        subclass: string;
        alternative_parent: string[];
        substituent: string[];
    }

    export interface DrugbankId2 {
        primary: boolean;
        $: string;
    }

    export interface Salt {
        drugbank_id: DrugbankId2[];
        name: string;
        unii: string;
        cas_number: string;
        inchikey: string;
        average_mass: number;
        monoisotopic_mass: number;
    }

    export interface Salts {
        salt: Salt[];
    }

    export interface Synonym {
        language: string;
        coder: string;
        $: string;
    }

    export interface Synonyms {
        synonym: Synonym[];
    }

    export interface Product {
        name: string;
        labeller: string;
        ndc_id: string;
        ndc_product_code: string;
        dpd_id: string;
        ema_product_code: string;
        ema_ma_number: string;
        started_marketing_on: string;
        ended_marketing_on: string;
        dosage_form: string;
        strength: string;
        route: string;
        fda_application_number: string;
        generic: boolean;
        over_the_counter: boolean;
        approved: boolean;
        country: string;
        source: string;
    }

    export interface Products {
        product: Product[];
    }

    export interface InternationalBrand {
        name: string;
        company: string;
    }

    export interface InternationalBrands {
        international_brand: InternationalBrand[];
    }

    export interface Mixture {
        name: string;
        ingredients: string;
    }

    export interface Mixtures {
        mixture: Mixture[];
    }

    export interface Packager {
        name: string;
        url: string;
    }

    export interface Packagers {
        packager: Packager[];
    }

    export interface Manufacturers {
    }

    export interface Cost {
        currency: string;
        $: string;
    }

    export interface Price {
        description: string;
        cost: Cost;
        unit: string;
    }

    export interface Prices {
        price: Price[];
    }

    export interface Category {
        category: string;
        mesh_id: string;
    }

    export interface Categories {
        category: Category[];
    }

    export interface AffectedOrganisms {
        affected_organism: string[];
    }

    export interface Dosage {
        form: string;
        route: string;
        strength: string;
    }

    export interface Dosages {
        dosage: Dosage[];
    }

    export interface Level {
        code: string;
        $: string;
    }

    export interface AtcCode {
        code: string;
        level: Level[];
    }

    export interface AtcCodes {
        atc_code: AtcCode[];
    }

    export interface AhfsCodes {
    }

    export interface PdbEntries {
    }

    export interface Patents {
    }

    export interface FoodInteractions {
        food_interaction: string[];
    }

    export interface DrugbankId3 {
        primary: boolean;
        $: string;
    }

    export interface DrugInteraction {
        drugbank_id: DrugbankId3;
        name: string;
        description: string;
    }

    export interface DrugInteractions {
        drug_interaction: DrugInteraction[];
    }

    export interface Property {
        kind: string;
        value: string;
        source: string;
    }

    export interface CalculatedProperties {
        property: Property[];
    }

    export interface Property2 {
        kind: string;
        value: string;
        source: string;
    }

    export interface ExperimentalProperties {
        property: Property2[];
    }

    export interface ExternalIdentifier {
        resource: string;
        identifier: string;
    }

    export interface ExternalIdentifiers {
        external_identifier: ExternalIdentifier[];
    }

    export interface ExternalLink {
        resource: string;
        url: string;
    }

    export interface ExternalLinks {
        external_link: ExternalLink[];
    }

    export interface Pathways {
    }

    export interface LeftElement {
        drugbank_id: string;
        name: string;
    }

    export interface RightElement {
        drugbank_id: string;
        name: string;
    }

    export interface Enzyme {
        drugbank_id: string;
        name: string;
        uniprot_id: string;
    }

    export interface Enzymes {
        enzyme: Enzyme[];
    }

    export interface Reaction {
        sequence: string;
        left_element: LeftElement;
        right_element: RightElement;
        enzymes: Enzymes;
    }

    export interface Reactions {
        reaction: Reaction[];
    }

    export interface SnpEffects {
    }

    export interface SnpAdverseDrugReactions {
    }

    export interface Actions {
        action: string[];
    }

    export interface Article2 {
        ref_id: string;
        pubmed_id: string;
        citation: string;
    }

    export interface Articles2 {
        article: Article2[];
    }

    export interface Textbooks2 {
    }

    export interface Links2 {
    }

    export interface Attachments2 {
    }

    export interface References {
        articles: Articles2;
        textbooks: Textbooks2;
        links: Links2;
        attachments: Attachments2;
    }

    export interface Organism {
        ncbi_taxonomy_id: string;
        $: string;
    }

    export interface ExternalIdentifier2 {
        resource: string;
        identifier: string;
    }

    export interface ExternalIdentifiers2 {
        external_identifier: ExternalIdentifier2[];
    }

    export interface Synonyms2 {
        synonym: string[];
    }

    export interface AminoAcidSequence {
        format: string;
        $: string;
    }

    export interface GeneSequence {
        format: string;
        $: string;
    }

    export interface Pfam {
        identifier: string;
        name: string;
    }

    export interface Pfams {
        pfam: Pfam[];
    }

    export interface GoClassifier {
        category: string;
        description: string;
    }

    export interface GoClassifiers {
        go_classifier: GoClassifier[];
    }

    export interface Polypeptide {
        id: string;
        source: string;
        name: string;
        general_function: string;
        specific_function: string;
        gene_name: string;
        locus: string;
        cellular_location: string;
        transmembrane_regions: string;
        signal_regions: string;
        theoretical_pi: string;
        molecular_weight: string;
        chromosome_location: string;
        organism: Organism;
        external_identifiers: ExternalIdentifiers2;
        synonyms: Synonyms2;
        amino_acid_sequence: AminoAcidSequence;
        gene_sequence: GeneSequence;
        pfams: Pfams;
        go_classifiers: GoClassifiers;
    }

    export interface Target {
        position: number;
        id: string;
        name: string;
        organism: string;
        actions: Actions;
        references: References;
        known_action: string;
        polypeptide: Polypeptide[];
    }

    export interface Targets {
        target: Target[];
    }

    export interface Actions2 {
        action: string[];
    }

    export interface Article3 {
        ref_id: string;
        pubmed_id: string;
        citation: string;
    }

    export interface Articles3 {
        article: Article3[];
    }

    export interface Textbooks3 {
    }

    export interface Links3 {
    }

    export interface Attachments3 {
    }

    export interface References2 {
        articles: Articles3;
        textbooks: Textbooks3;
        links: Links3;
        attachments: Attachments3;
    }

    export interface Organism2 {
        ncbi_taxonomy_id: string;
        $: string;
    }

    export interface ExternalIdentifier3 {
        resource: string;
        identifier: string;
    }

    export interface ExternalIdentifiers3 {
        external_identifier: ExternalIdentifier3[];
    }

    export interface Synonyms3 {
        synonym: string[];
    }

    export interface AminoAcidSequence2 {
        format: string;
        $: string;
    }

    export interface GeneSequence2 {
        format: string;
        $: string;
    }

    export interface Pfam2 {
        identifier: string;
        name: string;
    }

    export interface Pfams2 {
        pfam: Pfam2[];
    }

    export interface GoClassifier2 {
        category: string;
        description: string;
    }

    export interface GoClassifiers2 {
        go_classifier: GoClassifier2[];
    }

    export interface Polypeptide2 {
        id: string;
        source: string;
        name: string;
        general_function: string;
        specific_function: string;
        gene_name: string;
        locus: string;
        cellular_location: string;
        transmembrane_regions: string;
        signal_regions: string;
        theoretical_pi: string;
        molecular_weight: string;
        chromosome_location: string;
        organism: Organism2;
        external_identifiers: ExternalIdentifiers3;
        synonyms: Synonyms3;
        amino_acid_sequence: AminoAcidSequence2;
        gene_sequence: GeneSequence2;
        pfams: Pfams2;
        go_classifiers: GoClassifiers2;
    }

    export interface Enzyme2 {
        id: string;
        name: string;
        organism: string;
        actions: Actions2;
        references: References2;
        known_action: string;
        polypeptide: Polypeptide2[];
        inhibition_strength: string;
        induction_strength: string;
        position?: number;
    }

    export interface Enzymes2 {
        enzyme: Enzyme2[];
    }

    export interface Carriers {
    }

    export interface Transporters {
    }

    export interface DBDrug { // go.drugbank.com
        _id: string;
        type: string;
        created: string;
        updated: string;
        drugbank_id: DrugbankId[];
        name: string;
        description: string;
        cas_number: string;
        unii: string;
        average_mass: number;
        monoisotopic_mass: number;
        state: string;
        groups: Groups;
        general_references: GeneralReferences;
        synthesis_reference: string;
        indication: string;
        pharmacodynamics: string;
        mechanism_of_action: string;
        toxicity: string;
        metabolism: string;
        absorption: string;
        half_life: string;
        protein_binding: string;
        route_of_elimination: string;
        volume_of_distribution: string;
        clearance: string;
        classification: Classification;
        salts: Salts;
        synonyms: Synonyms;
        products: Products;
        international_brands: InternationalBrands;
        mixtures: Mixtures;
        packagers: Packagers;
        manufacturers: Manufacturers;
        prices: Prices;
        categories: Categories;
        affected_organisms: AffectedOrganisms;
        dosages: Dosages;
        atc_codes: AtcCodes;
        ahfs_codes: AhfsCodes;
        pdb_entries: PdbEntries;
        fda_label: string;
        msds: string;
        patents: Patents;
        food_interactions: FoodInteractions;
        drug_interactions: DrugInteractions;
        calculated_properties: CalculatedProperties;
        experimental_properties: ExperimentalProperties;
        external_identifiers: ExternalIdentifiers;
        external_links: ExternalLinks;
        pathways: Pathways;
        reactions: Reactions;
        snp_effects: SnpEffects;
        snp_adverse_drug_reactions: SnpAdverseDrugReactions;
        targets: Targets;
        enzymes: Enzymes2;
        carriers: Carriers;
        transporters: Transporters;
    }
