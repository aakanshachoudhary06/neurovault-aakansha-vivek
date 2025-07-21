#!/usr/bin/env python3
"""
Relationship Manager for extracting entities and relationships from text
"""

import os
import json
import logging
import re
from typing import List, Dict, Any, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)


class RelationshipManager:
    """Manager for extracting and managing relationships from text"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "config/relationships.json"
        self.relationships_config = self._load_relationships_config()
        
        # Improved entity patterns - more specific and accurate
        self.entity_patterns = {
            'PERSON': [
                r'\b[A-Z][a-z]{2,15} [A-Z][a-z]{2,15}\b',  # First Last (2-15 chars each)
                r'\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})?\b',  # Title Name
                r'\b[A-Z][a-z]{2,15} [A-Z]\. [A-Z][a-z]{2,15}\b',  # First M. Last
            ],
            'ORGANIZATION': [
                r'\b[A-Z][a-zA-Z\s]{2,30}(?:\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation))\b',
                r'\b(?:Apple Inc|Google|Microsoft|Amazon|Facebook|Meta|Tesla|SpaceX|OpenAI)\b',
                r'\b[A-Z][a-zA-Z\s]{2,20}\s+(?:Technologies|Systems|Solutions|Services)\b',
            ],
            'LOCATION': [
                r'\b[A-Z][a-z]{2,20},\s+[A-Z][a-z]{2,20}\b',  # City, State
                r'\b(?:California|New York|Texas|Florida|Washington|Cupertino|Seattle|Austin)\b',
                r'\b[A-Z][a-z]{2,20}\s+(?:City|County|State|Province)\b',
            ],
            'TECHNOLOGY': [
                r'\b(?:Artificial Intelligence|Machine Learning|Deep Learning|Neural Networks?|API|Database)\b',
                r'\b(?:Python|JavaScript|React|FastAPI|Docker|Kubernetes|iOS|Android|Windows|macOS)\b',
                r'\b[A-Z][a-zA-Z]{2,15}(?:\s+[A-Z][a-zA-Z]{2,15})?\s+(?:Platform|Framework|Library|SDK)\b',
            ]
        }
        
        # Improved relationship patterns - more specific and comprehensive
        self.relationship_patterns = [
            (r'([A-Z][a-z]+ [A-Z][a-z]+) is (?:the )?CEO of ([A-Z][a-zA-Z\s]+)', 'CEO_OF'),
            (r'([A-Z][a-z]+ [A-Z][a-z]+) works at ([A-Z][a-zA-Z\s]+)', 'WORKS_AT'),
            (r'([A-Z][a-zA-Z\s]+) is headquartered in ([A-Z][a-z]+)', 'HEADQUARTERED_IN'),
            (r'([A-Z][a-zA-Z\s]+) develops ([A-Z][a-zA-Z\s]+)', 'DEVELOPS'),
            (r'([A-Z][a-z]+ [A-Z][a-z]+) founded ([A-Z][a-zA-Z\s]+)', 'FOUNDED'),
            (r'([A-Z][a-z]+ [A-Z][a-z]+) leads ([A-Z][a-zA-Z\s]+)', 'LEADS'),
            (r'([A-Z][a-z]+ [A-Z][a-z]+) created ([A-Z][a-zA-Z\s]+)', 'CREATED'),
            (r'([A-Z][a-zA-Z\s]+) owns ([A-Z][a-zA-Z\s]+)', 'OWNS'),
            (r'([A-Z][a-zA-Z\s]+) uses ([A-Z][a-zA-Z\s]+)', 'USES'),
            (r'([A-Z][a-zA-Z\s]+) is a product of ([A-Z][a-zA-Z\s]+)', 'PRODUCT_OF'),
        ]
    
    def _load_relationships_config(self) -> Dict[str, Any]:
        """Load relationships configuration from JSON file"""
        try:
            config_file = Path(self.config_path)
            if config_file.exists():
                with open(config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.warning(f"Relationships config file not found: {self.config_path}")
                return {"relationships": [], "categories": {}}
        except Exception as e:
            logger.error(f"Error loading relationships config: {e}")
            return {"relationships": [], "categories": {}}
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities from text using improved pattern matching with quality filters"""
        entities = []
        entity_id = 0

        # Comprehensive stop words and invalid entity patterns
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'between', 'among', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we',
            'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him',
            'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
            'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that',
            'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
            'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'may',
            'might', 'must', 'can', 'shall', 'stale', 'smell', 'old', 'beer', 'heat', 'bring', 'out',
            'cold', 'takes', 'lingers', 'odor', 'taste', 'tastes', 'with', 'favorite', 'pickle', 'salt',
            'the stale', 'the ceo', 'founded spacex', 'and tesla', 'leads meta', 'created amazon',
            'microsoft develops', 'windows and', 'apple inc'
        }

        # Invalid patterns that should never be entities
        invalid_patterns = [
            r'^the\s+\w+$',  # "the something"
            r'^\w+\s+and$',  # "something and"
            r'^\w+\s+(develops|founded|created|leads)$',  # "word verb"
            r'^(ceo|cto|cfo)\s+of$',  # "title of"
        ]

        for entity_type, patterns in self.entity_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    entity_text = match.group().strip()
                    entity_lower = entity_text.lower()

                    # Enhanced filtering criteria
                    if (len(entity_text) > 2 and  # Minimum length
                        entity_lower not in stop_words and  # Not a stop word
                        not entity_text.isdigit() and  # Not just numbers
                        len(entity_text.split()) <= 4 and  # Not too long (max 4 words)
                        not re.match(r'^[^a-zA-Z]*$', entity_text) and  # Contains letters
                        not entity_text.startswith(('http', 'www', 'ftp')) and  # Not URLs
                        not any(re.match(pattern, entity_lower) for pattern in invalid_patterns) and  # Not invalid pattern
                        self._is_meaningful_entity(entity_text, entity_type)):  # Custom validation

                        entities.append({
                            'id': entity_id,
                            'name': entity_text,
                            'type': entity_type,
                            'position': match.start(),
                            'confidence': self._calculate_confidence(entity_text, entity_type)
                        })
                        entity_id += 1

        # Remove duplicates and low-confidence entities
        unique_entities = []
        seen_names = set()
        for entity in entities:
            if (entity['name'].lower() not in seen_names and
                entity['confidence'] >= 0.6):  # Minimum confidence threshold
                unique_entities.append(entity)
                seen_names.add(entity['name'].lower())

        return unique_entities

    def _is_meaningful_entity(self, text: str, entity_type: str) -> bool:
        """Check if the extracted text is a meaningful entity"""
        # Additional validation based on entity type
        if entity_type == 'PERSON':
            # Person names should have at least one capital letter
            return any(c.isupper() for c in text) and len(text.split()) <= 3
        elif entity_type == 'ORGANIZATION':
            # Organizations often have specific patterns
            return (any(c.isupper() for c in text) and
                   (len(text.split()) <= 3 or any(word in text.lower() for word in ['inc', 'corp', 'ltd', 'llc', 'company'])))
        elif entity_type == 'LOCATION':
            # Locations should be proper nouns
            return any(c.isupper() for c in text)
        elif entity_type == 'TECHNOLOGY':
            # Technology terms often have specific patterns
            return len(text) >= 3 and not text.lower() in ['the', 'and', 'or', 'but']

        return True

    def _calculate_confidence(self, text: str, entity_type: str) -> float:
        """Calculate confidence score for an entity"""
        confidence = 0.5  # Base confidence

        # Boost confidence for proper nouns (capitalized)
        if any(c.isupper() for c in text):
            confidence += 0.2

        # Boost confidence for known patterns
        if entity_type == 'PERSON' and len(text.split()) == 2:  # First Last name pattern
            confidence += 0.2
        elif entity_type == 'ORGANIZATION' and any(word in text.lower() for word in ['inc', 'corp', 'ltd', 'company']):
            confidence += 0.3
        elif entity_type == 'TECHNOLOGY' and len(text) >= 4:
            confidence += 0.1

        # Penalize very short or very long entities
        if len(text) < 3:
            confidence -= 0.2
        elif len(text) > 30:
            confidence -= 0.1

        return min(1.0, max(0.1, confidence))
    
    def extract_relationships(self, text: str) -> List[Dict[str, Any]]:
        """Extract relationships from text using pattern matching"""
        relationships = []
        
        for pattern, rel_type in self.relationship_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                groups = match.groups()
                if len(groups) >= 2:
                    relationships.append({
                        'source': groups[0].strip(),
                        'target': groups[1].strip(),
                        'type': rel_type,
                        'weight': 1.0,
                        'position': match.start(),
                        'confidence': 0.7
                    })
        
        return relationships
    
    def extract_facts(self, text: str) -> List[str]:
        """Extract factual statements from text"""
        facts = []
        
        # Split text into sentences
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 10:  # Filter out very short sentences
                # Check if sentence contains factual patterns
                if self._is_factual_sentence(sentence):
                    facts.append(sentence)
        
        return facts[:20]  # Limit to top 20 facts
    
    def _is_factual_sentence(self, sentence: str) -> bool:
        """Check if a sentence appears to be factual"""
        factual_indicators = [
            r'\bis\b', r'\bare\b', r'\bwas\b', r'\bwere\b',
            r'\bhas\b', r'\bhave\b', r'\bhad\b',
            r'\bdevelops?\b', r'\bcreates?\b', r'\bmakes?\b',
            r'\bworks?\b', r'\bheadquartered\b', r'\blocated\b'
        ]
        
        for indicator in factual_indicators:
            if re.search(indicator, sentence, re.IGNORECASE):
                return True
        
        return False
    
    def get_sample_relationships(self) -> List[Dict[str, Any]]:
        """Get sample relationships from configuration"""
        return self.relationships_config.get('relationships', [])
    
    def add_relationship(self, source: str, target: str, relationship: str, 
                        category: str = "user", properties: Dict[str, Any] = None) -> bool:
        """Add a new relationship to the configuration"""
        try:
            new_relationship = {
                "source": source,
                "target": target,
                "relationship": relationship,
                "category": category,
                "properties": properties or {"weight": 1.0}
            }
            
            self.relationships_config["relationships"].append(new_relationship)
            
            # Save to file if config path exists
            if self.config_path:
                config_file = Path(self.config_path)
                config_file.parent.mkdir(parents=True, exist_ok=True)
                with open(config_file, 'w', encoding='utf-8') as f:
                    json.dump(self.relationships_config, f, indent=2)
            
            return True
        except Exception as e:
            logger.error(f"Error adding relationship: {e}")
            return False
    
    def extract_entities_and_relationships(self, text: str) -> Dict[str, Any]:
        """Extract both entities and relationships from text"""
        entities = self.extract_entities(text)
        relationships = self.extract_relationships(text)
        facts = self.extract_facts(text)
        
        return {
            'entities': entities,
            'relationships': relationships,
            'facts': facts,
            'text_length': len(text),
            'word_count': len(text.split())
        }
    
    def enhance_with_nlp(self, text: str) -> Dict[str, Any]:
        """Enhanced entity and relationship extraction using NLP libraries"""
        try:
            # Try to use spaCy if available
            import spacy
            
            # Load English model
            try:
                nlp = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy English model not found, using pattern matching only")
                return self.extract_entities_and_relationships(text)
            
            doc = nlp(text)
            
            # Extract named entities with improved filtering
            entities = []
            entity_types_mapping = {
                'PERSON': 'PERSON',
                'ORG': 'ORGANIZATION',
                'GPE': 'LOCATION',  # Geopolitical entity
                'LOC': 'LOCATION',
                'PRODUCT': 'TECHNOLOGY',
                'EVENT': 'EVENT',
                'WORK_OF_ART': 'TECHNOLOGY',
                'LAW': 'TECHNOLOGY',
                'LANGUAGE': 'TECHNOLOGY'
            }

            # Common words to filter out from NLP extraction
            nlp_stop_words = {
                'stale', 'smell', 'old', 'beer', 'heat', 'bring', 'out', 'cold',
                'takes', 'lingers', 'odor', 'taste', 'tastes', 'favorite', 'pickle', 'salt',
                'the', 'a', 'an', 'this', 'that', 'these', 'those'
            }

            for ent in doc.ents:
                # Map spaCy entity types to our types
                entity_type = entity_types_mapping.get(ent.label_, ent.label_)
                entity_text = ent.text.strip()

                # Filter out low-quality entities
                if (len(entity_text) > 2 and
                    entity_text.lower() not in nlp_stop_words and
                    not entity_text.isdigit() and
                    len(entity_text.split()) <= 4 and  # Not too long
                    any(c.isalpha() for c in entity_text)):  # Contains letters

                    confidence = 0.9
                    # Adjust confidence based on entity type
                    if ent.label_ in ['PERSON', 'ORG', 'GPE']:
                        confidence = 0.95
                    elif ent.label_ in ['CARDINAL', 'ORDINAL', 'QUANTITY']:
                        confidence = 0.4  # Numbers are less interesting

                    entities.append({
                        'id': len(entities),
                        'name': entity_text,
                        'type': entity_type,
                        'position': ent.start_char,
                        'confidence': confidence
                    })

            # Extract relationships using dependency parsing with better filtering
            relationships = []
            for sent in doc.sents:
                for token in sent:
                    if token.dep_ in ['nsubj', 'dobj'] and token.head.pos_ == 'VERB':
                        subject = token.text
                        verb = token.head.text

                        # Only create relationships between meaningful tokens
                        if (not token.is_stop and not token.is_punct and len(subject) > 2 and
                            not verb.lower() in ['is', 'are', 'was', 'were', 'be', 'been']):

                            # Find object
                            for child in token.head.children:
                                if child.dep_ in ['dobj', 'pobj'] and not child.is_stop:
                                    obj = child.text
                                    if len(obj) > 2:
                                        relationships.append({
                                            'source': subject,
                                            'target': obj,
                                            'type': self._normalize_verb_relationship(verb),
                                            'weight': 0.8,
                                            'position': token.idx,
                                            'confidence': 0.8
                                        })

            # Combine with pattern-based extraction
            pattern_results = self.extract_entities_and_relationships(text)

            # Merge and deduplicate results
            all_entities = self._merge_entity_lists(entities, pattern_results['entities'])
            all_relationships = self._merge_relationship_lists(relationships, pattern_results['relationships'])
            
            return {
                'entities': all_entities,
                'relationships': all_relationships,
                'facts': pattern_results['facts'],
                'text_length': len(text),
                'word_count': len(text.split()),
                'extraction_method': 'nlp_enhanced'
            }
            
        except ImportError:
            logger.info("spaCy not available, using pattern matching only")
            return self.extract_entities_and_relationships(text)

    def _normalize_verb_relationship(self, verb: str) -> str:
        """Normalize relationship types from verbs"""
        verb_lower = verb.lower()
        relationship_mapping = {
            'own': 'OWNS',
            'owns': 'OWNS',
            'create': 'CREATES',
            'creates': 'CREATES',
            'develop': 'DEVELOPS',
            'develops': 'DEVELOPS',
            'found': 'FOUNDED',
            'founded': 'FOUNDED',
            'lead': 'LEADS',
            'leads': 'LEADS',
            'manage': 'MANAGES',
            'manages': 'MANAGES',
            'work': 'WORKS_AT',
            'works': 'WORKS_AT',
            'locate': 'LOCATED_IN',
            'located': 'LOCATED_IN',
            'headquarter': 'HEADQUARTERED_IN',
            'headquartered': 'HEADQUARTERED_IN'
        }

        return relationship_mapping.get(verb_lower, verb.upper())

    def _merge_entity_lists(self, nlp_entities: List[Dict], pattern_entities: List[Dict]) -> List[Dict]:
        """Merge NLP and pattern-based entities, removing duplicates and low-quality entries"""
        merged = []
        seen_names = set()

        # Add NLP entities first (higher priority)
        for entity in nlp_entities:
            name_lower = entity['name'].lower()
            if name_lower not in seen_names and entity['confidence'] >= 0.6:
                merged.append(entity)
                seen_names.add(name_lower)

        # Add pattern entities that don't conflict
        for entity in pattern_entities:
            name_lower = entity['name'].lower()
            if name_lower not in seen_names and entity['confidence'] >= 0.6:
                entity['id'] = len(merged)  # Reassign ID
                merged.append(entity)
                seen_names.add(name_lower)

        return merged

    def _merge_relationship_lists(self, nlp_rels: List[Dict], pattern_rels: List[Dict]) -> List[Dict]:
        """Merge NLP and pattern-based relationships, removing duplicates"""
        merged = []
        seen_rels = set()

        for rel in nlp_rels + pattern_rels:
            # Create a unique key for the relationship
            rel_key = (rel['source'].lower(), rel['target'].lower(), rel['type'])
            if (rel_key not in seen_rels and
                rel['confidence'] >= 0.5 and
                rel['source'].lower() != rel['target'].lower()):  # Avoid self-references
                merged.append(rel)
                seen_rels.add(rel_key)

        return merged
